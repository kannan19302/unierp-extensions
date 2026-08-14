import type {
  Extension,
  ExtensionRequest,
  ExtensionResponse,
} from "@kannan19302/extension-api";
import {
  cdsEvaluate,
  claimsScrub,
  eligibilityCheck,
  fhirObservation,
  fhirPatient,
  qualityMeasures,
  rxInteractions,
} from "./smart";
import {
  createAppointment,
  createMedicalEncounter,
  createPatient,
  createPractitioner,
  createPrescription,
  getAppointments,
  getDrugRegister,
  getMedicalEncounters,
  getPatients,
  getPractitioners,
  getPrescriptions,
  logDrugRegister,
  MedicalEncounterRecord,
  PatientRecord,
  PractitionerRecord,
  PrescriptionRecord,
  AppointmentRecord,
  DrugRegisterRecord,
} from "./crud";
import {
  createClinicalPrescription,
  createEncounterWithCharting,
  exportPatientFhirBundle,
  getPatientSummary,
  logPhiAccess,
  PhiAccessRecord,
  submitClaim,
} from "./clinical";

/**
 * Route wiring for the Healthcare extension (E26). Every archived controller
 * endpoint from `unierp-app-healthcare` maps to one handler here. The archived
 * services fetched the tenant's records from the core data layer; here the
 * extension receives those record sets in the request body (`records`) — the
 * platform is the authority on tenant identity and storage, exactly as in the
 * sandbox contract. The computation is identical to the archived service.
 */

interface RequestWithRecords<T> {
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: T & { records?: Partial<Record<string, unknown[]>> };
}

function readRecords(body: unknown): Record<string, unknown[]> {
  if (!body || typeof body !== "object") return {};
  const { records } = body as { records?: Record<string, unknown[]> };
  return records ?? {};
}

async function handle(
  fn: () => unknown,
  req: ExtensionRequest,
  res: ExtensionResponse,
): Promise<void> {
  try {
    res.json(fn());
  } catch (err) {
    const status = err instanceof Error && err.name === "NotFoundError" ? 404 : 400;
    res.status?.(status);
    res.json({ error: err instanceof Error ? err.message : String(err) });
  }
}

export const healthcareRoutes: NonNullable<Extension["customRoutes"]> = {
  // ── Smart services (healthcare-smart.controller.ts) ──
  "/eligibility/check": async (req, res) => {
    const body = (req.body ?? {}) as RequestWithRecords<{ patient_mrn: string }>["body"];
    const records = readRecords(body);
    await handle(
      () => eligibilityCheck((records.coverage ?? []) as never[], { patient_mrn: String(body?.patient_mrn ?? "") }),
      req,
      res,
    );
  },

  "/claims/scrub": async (req, res) => {
    const body = (req.body ?? {}) as RequestWithRecords<{
      patient_mrn?: string;
      payer?: string;
      icd10_code?: string;
      cpt_code?: string;
      amount?: number;
    }>["body"];
    const records = readRecords(body);
    await handle(
      () =>
        claimsScrub((records.coverage ?? []) as never[], {
          patient_mrn: body?.patient_mrn,
          payer: body?.payer,
          icd10_code: body?.icd10_code,
          cpt_code: body?.cpt_code,
          amount: body?.amount,
        }),
      req,
      res,
    );
  },

  "/rx/interactions": async (req, res) => {
    const body = (req.body ?? {}) as RequestWithRecords<{
      patient_mrn?: string;
      meds?: string[];
    }>["body"];
    const records = readRecords(body);
    await handle(
      () =>
        rxInteractions((records.medication ?? []) as never[], {
          patient_mrn: body?.patient_mrn,
          meds: body?.meds,
        }),
      req,
      res,
    );
  },

  "/cds/evaluate": async (req, res) => {
    const body = (req.body ?? {}) as RequestWithRecords<{
      patient_mrn: string;
      order_drug?: string;
    }>["body"];
    const records = readRecords(body);
    await handle(
      () =>
        cdsEvaluate(
          {
            allergies: (records.allergy ?? []) as never[],
            problems: (records.problem ?? []) as never[],
            labs: (records["lab-result"] ?? []) as never[],
            medications: (records.medication ?? []) as never[],
          },
          { patient_mrn: String(body?.patient_mrn ?? ""), order_drug: body?.order_drug },
        ),
      req,
      res,
    );
  },

  "/quality/measures": async (req, res) => {
    const records = readRecords(req.body);
    await handle(
      () =>
        qualityMeasures({
          patients: (records.patient ?? []) as never[],
          problems: (records.problem ?? []) as never[],
          labs: (records["lab-result"] ?? []) as never[],
          immunizations: (records["immunization-record"] ?? []) as never[],
        }),
      req,
      res,
    );
  },

  "/fhir/Patient": async (req, res) => {
    const records = readRecords(req.body);
    await handle(
      () => fhirPatient((records.patient ?? []) as never[], req.query?.mrn),
      req,
      res,
    );
  },

  "/fhir/Observation": async (req, res) => {
    const records = readRecords(req.body);
    await handle(
      () =>
        fhirObservation(
          { labs: (records["lab-result"] ?? []) as never[], vitals: (records.vital ?? []) as never[] },
          req.query?.mrn,
        ),
      req,
      res,
    );
  },

  // ── Legacy CRUD (healthcare.controller.ts) ──
  "/patients": async (req, res) => {
    const body = (req.body ?? {}) as { records?: { patient?: PatientRecord[] } };
    const q = req.query ?? {};
    const patients = body.records?.patient ?? [];
    if (req.query?.__create === "1") {
      await handle(
        () => createPatient(patients, "", { ...(req.body as Record<string, string>) } as never),
        req,
        res,
      );
      return;
    }
    await handle(
      () =>
        getPatients(patients, "", {
          page: q.page ? parseInt(q.page) : undefined,
          limit: q.limit ? parseInt(q.limit) : undefined,
          sort: q.sort,
          search: q.search,
        }),
      req,
      res,
    );
  },

  "/practitioners": async (req, res) => {
    const body = (req.body ?? {}) as { records?: { practitioner?: PractitionerRecord[] } };
    const q = req.query ?? {};
    const practitioners = body.records?.practitioner ?? [];
    if (req.query?.__create === "1") {
      await handle(
        () =>
          createPractitioner(practitioners, "", { ...(req.body as Record<string, string>) } as never),
        req,
        res,
      );
      return;
    }
    await handle(
      () =>
        getPractitioners(practitioners, "", {
          page: q.page ? parseInt(q.page) : undefined,
          limit: q.limit ? parseInt(q.limit) : undefined,
          sort: q.sort,
        }),
      req,
      res,
    );
  },

  "/appointments": async (req, res) => {
    const body = (req.body ?? {}) as { records?: { appointment?: AppointmentRecord[] } };
    const appointments = body.records?.appointment ?? [];
    if (req.query?.__create === "1") {
      await handle(
        () => createAppointment(appointments, "", { ...(req.body as Record<string, string>) } as never),
        req,
        res,
      );
      return;
    }
    await handle(() => getAppointments(appointments, ""), req, res);
  },

  "/prescriptions": async (req, res) => {
    const body = (req.body ?? {}) as { records?: { prescription?: PrescriptionRecord[] } };
    const prescriptions = body.records?.prescription ?? [];
    if (req.query?.__create === "1") {
      await handle(
        () => createPrescription(prescriptions, "", { ...(req.body as Record<string, string>) } as never),
        req,
        res,
      );
      return;
    }
    await handle(() => getPrescriptions(prescriptions, ""), req, res);
  },

  "/drugs": async (req, res) => {
    const body = (req.body ?? {}) as { records?: { drug_register?: DrugRegisterRecord[] } };
    const drugRegister = body.records?.drug_register ?? [];
    if (req.query?.__create === "1") {
      await handle(
        () => logDrugRegister(drugRegister, "", { ...(req.body as Record<string, string>) } as never),
        req,
        res,
      );
      return;
    }
    await handle(() => getDrugRegister(drugRegister, ""), req, res);
  },

  "/encounters": async (req, res) => {
    const body = (req.body ?? {}) as { records?: { medical_encounter?: MedicalEncounterRecord[] } };
    const encounters = body.records?.medical_encounter ?? [];
    if (req.query?.__create === "1") {
      await handle(
        () => createMedicalEncounter(encounters, "", { ...(req.body as Record<string, string>) } as never),
        req,
        res,
      );
      return;
    }
    await handle(() => getMedicalEncounters(encounters, ""), req, res);
  },

  // ── Clinical (clinical.controller.ts) ──
  "/clinical/patients/:patientId/summary": async (req, res) => {
    const body = (req.body ?? {}) as {
      records?: {
        patient?: PatientRecord[];
        appointment?: AppointmentRecord[];
        prescription?: PrescriptionRecord[];
        medical_encounter?: MedicalEncounterRecord[];
      };
    };
    const r = body.records ?? {};
    const patientId = req.params?.patientId ?? "";
    await handle(
      () =>
        getPatientSummary(
          {
            patients: r.patient ?? [],
            appointments: r.appointment ?? [],
            prescriptions: r.prescription ?? [],
            encounters: r.medical_encounter ?? [],
          },
          "",
          patientId,
        ),
      req,
      res,
    );
  },

  "/clinical/encounters": async (req, res) => {
    const body = (req.body ?? {}) as {
      records?: { patient?: PatientRecord[]; medical_encounter?: MedicalEncounterRecord[] };
    };
    const r = body.records ?? {};
    await handle(
      () =>
        createEncounterWithCharting(r.medical_encounter ?? [], r.patient ?? [], "", {
          ...((req.body as Record<string, unknown>) ?? {}),
        } as never),
      req,
      res,
    );
  },

  "/clinical/encounters/:id/submit-claim": async (req, res) => {
    const body = (req.body ?? {}) as { records?: { medical_encounter?: MedicalEncounterRecord[] } };
    const encounters = body.records?.medical_encounter ?? [];
    await handle(() => submitClaim(encounters, "", req.params?.id ?? ""), req, res);
  },

  "/clinical/prescriptions": async (req, res) => {
    const body = (req.body ?? {}) as {
      records?: { patient?: PatientRecord[]; prescription?: PrescriptionRecord[] };
    };
    const r = body.records ?? {};
    await handle(
      () =>
        createClinicalPrescription(r.prescription ?? [], r.patient ?? [], "", {
          ...((req.body as Record<string, unknown>) ?? {}),
        } as never),
      req,
      res,
    );
  },

  "/clinical/patients/:patientId/fhir": async (req, res) => {
    const body = (req.body ?? {}) as {
      records?: {
        patient?: PatientRecord[];
        medical_encounter?: MedicalEncounterRecord[];
        prescription?: PrescriptionRecord[];
      };
    };
    const r = body.records ?? {};
    await handle(
      () =>
        exportPatientFhirBundle(
          {
            patients: r.patient ?? [],
            encounters: r.medical_encounter ?? [],
            prescriptions: r.prescription ?? [],
          },
          "",
          req.params?.patientId ?? "",
        ),
      req,
      res,
    );
  },

  "/clinical/phi-log": async (req, res) => {
    const body = (req.body ?? {}) as {
      records?: { phi_access_log?: PhiAccessRecord[] };
      userId?: string;
      patientId?: string;
      action?: string;
    };
    const logs = body.records?.phi_access_log ?? [];
    await handle(
      () =>
        logPhiAccess(
          logs,
          "",
          body?.userId ?? "",
          body?.patientId ?? "",
          body?.action ?? "",
        ),
      req,
      res,
    );
  },
};
