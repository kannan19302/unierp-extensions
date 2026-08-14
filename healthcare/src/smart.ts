import { REFERENCE_DATA } from "./reference-data";

/**
 * "Smart" clinical + revenue-cycle services for the Healthcare extension.
 *
 * Ported from `unierp-app-healthcare/src/healthcare-smart.service.ts` (E26).
 * The archived service read its custom records (`healthcare_*` schemas) from
 * the core data layer; here the same logic runs as pure functions over the
 * in-memory record sets the platform hands the extension for the declared
 * schema entities (coverage, medication, allergy, problem, lab-result, vital,
 * immunization-record, patient). Workflows that would require external
 * networks (Surescripts, EDI, HL7, PACS) remain represented as records and
 * the FHIR endpoints expose read-only projections — exactly as archived.
 */

export interface CoverageRecord extends Record<string, unknown> {
  patient_mrn: string;
  payer?: string;
  member_id?: string;
  group_no?: string;
  copay?: number | string;
  deductible?: number | string;
  active?: boolean;
}

export interface MedicationRecord extends Record<string, unknown> {
  patient_mrn: string;
  drug?: string;
  status?: string;
}

export interface AllergyRecord extends Record<string, unknown> {
  patient_mrn: string;
  allergen?: string;
}

export interface ProblemRecord extends Record<string, unknown> {
  patient_mrn: string;
  description?: string;
}

export interface LabResultRecord extends Record<string, unknown> {
  patient_mrn: string;
  test_name?: string;
  loinc_code?: string;
  value?: number | string;
  unit?: string;
  flag?: string;
  resulted_at?: string;
}

export interface VitalRecord extends Record<string, unknown> {
  patient_mrn: string;
  systolic?: number | string;
  diastolic?: number | string;
  recorded_at?: string;
}

export interface PatientRecord extends Record<string, unknown> {
  mrn: string;
  first_name?: string;
  last_name?: string;
  sex?: string;
  date_of_birth?: string;
  phone?: string;
}

export interface ImmunizationRecord extends Record<string, unknown> {
  patient_mrn: string;
  vaccine?: string;
}

// ── Eligibility (270/271-shaped) ──

export function eligibilityCheck(
  coverages: CoverageRecord[],
  body: { patient_mrn: string },
) {
  const cov = coverages.find(
    (c) => c.patient_mrn === body.patient_mrn && c.active !== false,
  );
  if (!cov) {
    return {
      patient_mrn: body.patient_mrn,
      eligible: false,
      message: "No active coverage on file",
    };
  }
  return {
    patient_mrn: body.patient_mrn,
    eligible: true,
    payer: cov.payer,
    member_id: cov.member_id,
    plan: {
      group: cov.group_no,
      copay: Number(cov.copay) || 0,
      deductible: Number(cov.deductible) || 0,
    },
    checkedAt: new Date().toISOString(),
  };
}

// ── Claim scrubber (rule-based edits) ──

export interface ScrubInput {
  patient_mrn?: string;
  payer?: string;
  icd10_code?: string;
  cpt_code?: string;
  amount?: number;
}

export function claimsScrub(coverages: CoverageRecord[], body: ScrubInput) {
  const edits: Array<{ code: string; severity: "error" | "warning"; message: string }> = [];

  if (!body.icd10_code) {
    edits.push({ code: "DX_MISSING", severity: "error", message: "Diagnosis (ICD-10) is required" });
  } else if (!REFERENCE_DATA.icd10.some((d) => d.code === body.icd10_code)) {
    edits.push({ code: "DX_UNKNOWN", severity: "warning", message: `ICD-10 ${body.icd10_code} not in reference set` });
  }

  if (!body.cpt_code) {
    edits.push({ code: "CPT_MISSING", severity: "error", message: "Procedure (CPT) is required" });
  } else if (!REFERENCE_DATA.cpt.some((c) => c.code === body.cpt_code)) {
    edits.push({ code: "CPT_UNKNOWN", severity: "warning", message: `CPT ${body.cpt_code} not in reference set` });
  }

  if (!body.payer) {
    edits.push({ code: "PAYER_MISSING", severity: "error", message: "Payer is required" });
  }

  if (body.amount != null && Number(body.amount) <= 0) {
    edits.push({ code: "AMT_INVALID", severity: "error", message: "Charge amount must be greater than zero" });
  }

  if (body.patient_mrn) {
    const elig = eligibilityCheck(coverages, { patient_mrn: body.patient_mrn });
    if (!elig.eligible) {
      edits.push({ code: "NO_COVERAGE", severity: "warning", message: "No active coverage found for patient" });
    }
  }

  const clean = edits.filter((e) => e.severity === "error").length === 0;
  return { clean, edits, scrubbedAt: new Date().toISOString() };
}

// ── Drug interaction check ──

export function rxInteractions(
  medications: MedicationRecord[],
  body: { patient_mrn?: string; meds?: string[] },
) {
  let meds = (body.meds || []).filter(Boolean);
  if (body.patient_mrn) {
    const active = medications
      .filter((m) => m.patient_mrn === body.patient_mrn && m.status !== "Stopped")
      .map((m) => m.drug)
      .filter(Boolean) as string[];
    meds = Array.from(new Set([...meds, ...active]));
  }

  const hits: Array<{ drugs: string[]; severity: string; note: string }> = [];
  for (let i = 0; i < meds.length; i++) {
    for (let j = i + 1; j < meds.length; j++) {
      const a = meds[i];
      const b = meds[j];
      if (!a || !b) continue;
      const pair = REFERENCE_DATA.drugInteractions.find(
        (d) => (d.a === a && d.b === b) || (d.a === b && d.b === a),
      );
      if (pair) hits.push({ drugs: [a, b], severity: pair.severity, note: pair.note });
    }
  }

  return { meds, interactions: hits, hasMajor: hits.some((h) => h.severity === "Major") };
}

// ── Clinical Decision Support ──

export function cdsEvaluate(
  records: {
    allergies: AllergyRecord[];
    problems: ProblemRecord[];
    labs: LabResultRecord[];
    medications: MedicationRecord[];
  },
  body: { patient_mrn: string; order_drug?: string },
) {
  const alerts: Array<{ type: string; severity: string; message: string }> = [];
  const allergies = records.allergies.filter((a) => a.patient_mrn === body.patient_mrn);
  const problems = records.problems.filter((p) => p.patient_mrn === body.patient_mrn);
  const labs = records.labs.filter((l) => l.patient_mrn === body.patient_mrn);

  if (body.order_drug) {
    if (allergies.some((a) => (a.allergen || "").toLowerCase() === body.order_drug!.toLowerCase())) {
      alerts.push({ type: "allergy", severity: "high", message: `Patient is allergic to ${body.order_drug}` });
    }
    const rx = rxInteractions(records.medications, {
      patient_mrn: body.patient_mrn,
      meds: [body.order_drug],
    });
    for (const h of rx.interactions) {
      alerts.push({
        type: "interaction",
        severity: h.severity === "Major" ? "high" : "moderate",
        message: `${h.drugs.join(" + ")}: ${h.note}`,
      });
    }
  }

  if (labs.some((l) => l.flag === "Critical")) {
    alerts.push({ type: "lab", severity: "high", message: "Patient has an unaddressed critical lab result" });
  }

  if (problems.some((p) => /diabetes/i.test(p.description || "")) && !labs.some((l) => /a1c/i.test(l.test_name || ""))) {
    alerts.push({ type: "care-gap", severity: "low", message: "Diabetic patient with no recent HbA1c" });
  }

  return { patient_mrn: body.patient_mrn, alerts, count: alerts.length };
}

// ── Quality measures (HEDIS/MIPS-style, computed) ──

export function qualityMeasures(
  records: {
    patients: PatientRecord[];
    problems: ProblemRecord[];
    labs: LabResultRecord[];
    immunizations: ImmunizationRecord[];
  },
) {
  const patients: PatientRecord[] = records.patients;
  const problems: ProblemRecord[] = records.problems;
  const labs: LabResultRecord[] = records.labs;
  const immun: ImmunizationRecord[] = records.immunizations;

  const diabetics = problems.filter((p) => /diabetes/i.test(p.description || "")).map((p) => p.patient_mrn);
  const diabeticsWithA1c = new Set(labs.filter((l) => /a1c/i.test(l.test_name || "")).map((l) => l.patient_mrn));
  const a1cControlled = labs.filter((l) => /a1c/i.test(l.test_name || "") && Number(l.value) <= 9).length;

  const measure = (num: number, den: number) => ({
    numerator: num,
    denominator: den,
    rate: den ? Math.round((num / den) * 100) : 0,
  });

  return {
    measures: [
      { id: "CDC-A1C-TEST", title: "Diabetics with HbA1c tested", ...measure(diabetics.filter((m) => diabeticsWithA1c.has(m)).length, diabetics.length) },
      { id: "CDC-A1C-CONTROL", title: "Diabetics with HbA1c <= 9%", ...measure(a1cControlled, diabetics.length) },
      { id: "IMM-FLU", title: "Patients with influenza immunization", ...measure(new Set(immun.filter((i) => /influenza/i.test(i.vaccine || "")).map((i) => i.patient_mrn)).size, patients.length) },
    ],
    computedAt: new Date().toISOString(),
  };
}

// ── FHIR R4-shaped read projections ──

export function fhirPatient(patients: PatientRecord[], mrn?: string) {
  let list = patients;
  if (mrn) list = list.filter((p) => p.mrn === mrn);
  return {
    resourceType: "Bundle",
    type: "searchset",
    total: list.length,
    entry: list.map((p) => ({
      resource: {
        resourceType: "Patient",
        id: p.mrn,
        identifier: [{ system: "urn:mrn", value: p.mrn }],
        name: [{ family: p.last_name, given: [p.first_name] }],
        gender: (p.sex || "").toLowerCase() || "unknown",
        birthDate: p.date_of_birth || undefined,
        telecom: p.phone ? [{ system: "phone", value: p.phone }] : undefined,
      },
    })),
  };
}

export function fhirObservation(
  records: { labs: LabResultRecord[]; vitals: VitalRecord[] },
  mrn?: string,
) {
  let labs = records.labs;
  let vitals = records.vitals;
  if (mrn) {
    labs = labs.filter((l) => l.patient_mrn === mrn);
    vitals = vitals.filter((v) => v.patient_mrn === mrn);
  }

  const obs = [
    ...labs.map((l) => ({
      resource: {
        resourceType: "Observation",
        status: "final",
        category: [{ text: "laboratory" }],
        code: { coding: [{ system: "http://loinc.org", code: l.loinc_code, display: l.test_name }], text: l.test_name },
        subject: { reference: `Patient/${l.patient_mrn}` },
        valueQuantity: { value: Number(l.value), unit: l.unit },
        interpretation: l.flag ? [{ text: l.flag }] : undefined,
        effectiveDateTime: l.resulted_at,
      },
    })),
    ...vitals.map((v) => ({
      resource: {
        resourceType: "Observation",
        status: "final",
        category: [{ text: "vital-signs" }],
        code: { text: "Blood pressure" },
        subject: { reference: `Patient/${v.patient_mrn}` },
        component: [
          { code: { text: "Systolic" }, valueQuantity: { value: Number(v.systolic), unit: "mmHg" } },
          { code: { text: "Diastolic" }, valueQuantity: { value: Number(v.diastolic), unit: "mmHg" } },
        ],
        effectiveDateTime: v.recorded_at,
      },
    })),
  ];

  return { resourceType: "Bundle", type: "searchset", total: obs.length, entry: obs };
}
