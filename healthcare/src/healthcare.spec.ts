import { describe, expect, it } from "vitest";
import { ExtensionContext, Extension } from "@kannan19302/extension-api";
import factory, { manifest, healthcareRoutes } from "./index";
import { REFERENCE_DATA } from "./reference-data";
import {
  eligibilityCheck,
  claimsScrub,
  rxInteractions,
  cdsEvaluate,
  qualityMeasures,
  fhirPatient,
  fhirObservation,
} from "./smart";
import { getPatientSummary, exportPatientFhirBundle, submitClaim, NotFoundError } from "./clinical";
import { getPatients, createPatient } from "./crud";

function ctx(tenantId: string): ExtensionContext {
  return { tenantId, api: { log: () => {} } };
}

describe("healthcare manifest", () => {
  it("declares a valid manifest with schema entities", () => {
    expect(manifest.id).toBe("healthcare");
    expect(manifest.scopes).toContain("data:read");
    expect(manifest.scopes).toContain("log:write");
    expect(manifest.schema).toBeDefined();
    expect(manifest.schema?.entities.length).toBeGreaterThan(0);
    expect(manifest.entryPoint).toBe("dist/index.js");
  });

  it("factory returns an extension with lifecycle hooks and customRoutes", () => {
    const ext: Extension = factory(ctx("t1"));
    expect(typeof ext.onInstall).toBe("function");
    expect(typeof ext.onEnable).toBe("function");
    expect(typeof ext.customRoutes).toBe("object");
    expect(healthcareRoutes["/eligibility/check"]).toBeTypeOf("function");
  });
});

describe("eligibility (270/271-shaped)", () => {
  it("finds active coverage and returns payer/plan", () => {
    const result = eligibilityCheck(
      [{ patient_mrn: "M1", payer: "Aetna", member_id: "MEM1", group_no: "G1", copay: 20, deductible: 500, active: true }],
      { patient_mrn: "M1" },
    );
    expect(result.eligible).toBe(true);
    expect(result.payer).toBe("Aetna");
    expect(result.plan.copay).toBe(20);
  });

  it("returns not eligible when no active coverage", () => {
    const result = eligibilityCheck([{ patient_mrn: "M1", active: false }], { patient_mrn: "M1" });
    expect(result.eligible).toBe(false);
  });
});

describe("claims scrubber", () => {
  it("flags a missing diagnosis and unknown CPT", () => {
    const result = claimsScrub([], { patient_mrn: "M1", payer: "Aetna", cpt_code: "99999", amount: 100 });
    const codes = result.edits.map((e) => e.code);
    expect(codes).toContain("DX_MISSING");
    expect(codes).toContain("CPT_UNKNOWN");
    expect(result.clean).toBe(false);
  });

  it("cleans a well-formed claim against the reference set", () => {
    const result = claimsScrub(
      [{ patient_mrn: "M1", active: true }],
      { patient_mrn: "M1", payer: "Aetna", icd10_code: "E11.9", cpt_code: "99213", amount: 120 },
    );
    expect(result.clean).toBe(true);
  });
});

describe("drug interactions", () => {
  it("catches a Major interaction from active medications", () => {
    const result = rxInteractions(
      [{ patient_mrn: "M1", drug: "Warfarin", status: "Active" }, { patient_mrn: "M1", drug: "Aspirin", status: "Active" }],
      { patient_mrn: "M1" },
    );
    expect(result.hasMajor).toBe(true);
    expect(result.interactions[0].note).toContain("bleeding");
  });

  it("uses the archived reference data", () => {
    expect(REFERENCE_DATA.drugInteractions.length).toBeGreaterThan(0);
    expect(REFERENCE_DATA.icd10.some((d) => d.code === "E11.9")).toBe(true);
  });
});

describe("clinical decision support", () => {
  it("raises an allergy alert for a known allergen", () => {
    const result = cdsEvaluate(
      {
        allergies: [{ patient_mrn: "M1", allergen: "Penicillin" }],
        problems: [],
        labs: [],
        medications: [],
      },
      { patient_mrn: "M1", order_drug: "penicillin" },
    );
    expect(result.alerts.some((a) => a.type === "allergy")).toBe(true);
  });
});

describe("quality measures", () => {
  it("computes HbA1c control measure", () => {
    const result = qualityMeasures({
      patients: [{ mrn: "M1" }],
      problems: [{ patient_mrn: "M1", description: "Type 2 diabetes" }],
      labs: [{ patient_mrn: "M1", test_name: "Hemoglobin A1c", value: 7 }],
      immunizations: [],
    });
    const a1c = result.measures.find((m) => m.id === "CDC-A1C-CONTROL");
    expect(a1c).toBeDefined();
    expect(a1c?.numerator).toBe(1);
  });
});

describe("FHIR projections", () => {
  it("projects a Patient bundle", () => {
    const bundle = fhirPatient([{ mrn: "M1", first_name: "Ada", last_name: "Lovelace", sex: "F" }]);
    expect(bundle.resourceType).toBe("Bundle");
    expect(bundle.entry[0].resource.gender).toBe("f");
  });

  it("projects observations from labs and vitals", () => {
    const bundle = fhirObservation(
      {
        labs: [{ patient_mrn: "M1", test_name: "Hemoglobin A1c", loinc_code: "4548-4", value: 7, unit: "%" }],
        vitals: [{ patient_mrn: "M1", systolic: 120, diastolic: 80 }],
      },
      "M1",
    );
    expect(bundle.total).toBe(2);
  });
});

describe("clinical summaries and claims", () => {
  it("builds a patient summary and submits a claim", () => {
    const patients = [createPatient([], "t1", {
      firstName: "Ada", lastName: "Lovelace", dateOfBirth: "1815-12-10", gender: "F",
    })];
    const summary = getPatientSummary(
      { patients, appointments: [], prescriptions: [], encounters: [] },
      "t1",
      patients[0].id,
    );
    expect(summary.patient.lastName).toBe("Lovelace");

    const encounters = [{ ...createEncounterLike(patients[0].id, "t1"), claimStatus: "DRAFT" }];
    const submitted = submitClaim(encounters, "t1", encounters[0].id);
    expect(submitted.claimStatus).toBe("SUBMITTED");
  });

  it("throws NotFoundError for unknown patient", () => {
    expect(() => getPatientSummary({ patients: [], appointments: [], prescriptions: [], encounters: [] }, "t1", "nope")).toThrow(NotFoundError);
  });

  it("exports a FHIR collection bundle", () => {
    const patient = createPatient([], "t1", {
      firstName: "Ada", lastName: "Lovelace", dateOfBirth: "1815-12-10", gender: "F",
    });
    const bundle = exportPatientFhirBundle({ patients: [patient], encounters: [], prescriptions: [] }, "t1", patient.id);
    expect(bundle.entry[0].resource.resourceType).toBe("Patient");
  });
});

describe("CRUD pagination", () => {
  it("pages patients like the archived service", () => {
    const patients = Array.from({ length: 30 }, (_, i) =>
      createPatient([], "t1", {
        firstName: `P${i}`, lastName: "Doe", dateOfBirth: "1990-01-01", gender: "F",
      }),
    );
    const page = getPatients(patients, "t1", { page: 2, limit: 25 });
    expect(page.data.length).toBe(5);
    expect(page.meta.totalPages).toBe(2);
  });
});

function createEncounterLike(patientId: string, tenantId: string) {
  return {
    id: "enc_1", tenantId, patientId, practitionerId: "p1",
    diagnosis: "I10", treatmentCode: "99213", billingAmount: 100, createdAt: new Date(),
  };
}
