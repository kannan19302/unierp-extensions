import type {
  ExtensionEntity,
  ExtensionField,
  ExtensionSchema,
} from "@kannan19302/extension-api";

/**
 * Declared data model for the Healthcare extension.
 *
 * Ported from `unierp-app-healthcare/prisma/schema.prisma` plus the
 * "smart" custom-record schemas the marketplace provisioned at install time.
 * The platform provisions one `ext_healthcare_<entity>` table per entity,
 * each with `tenant_id` + RLS, from this declaration (see
 * ExtensionSchemaService.provision). Money fields are `decimal` (Decimal(19,4))
 * — billing, copay and deductible are never Float.
 */

function f(
  name: string,
  type: ExtensionField["type"],
  opts: { required?: boolean; indexed?: boolean } = {},
): ExtensionField {
  return { name, type, required: opts.required ?? false, indexed: opts.indexed ?? false };
}

const patients: ExtensionEntity = {
  name: "patient",
  fields: [
    f("first_name", "string", { required: true, indexed: true }),
    f("last_name", "string", { required: true }),
    f("date_of_birth", "datetime"),
    f("gender", "string"),
    f("email", "string"),
    f("phone", "string"),
    f("medical_history", "json"),
    f("vitals_history", "json"),
    f("allergies", "json"),
    f("status", "string"),
  ],
};

const practitioners: ExtensionEntity = {
  name: "practitioner",
  fields: [
    f("employee_id", "string", { required: true }),
    f("specialty", "string", { required: true }),
    f("license_number", "string", { required: true }),
    f("status", "string"),
  ],
};

const appointments: ExtensionEntity = {
  name: "appointment",
  fields: [
    f("patient_id", "string", { required: true, indexed: true }),
    f("practitioner_id", "string", { required: true }),
    f("start_time", "datetime", { required: true }),
    f("end_time", "datetime", { required: true }),
    f("status", "string"),
    f("notes", "text"),
  ],
};

const prescriptions: ExtensionEntity = {
  name: "prescription",
  fields: [
    f("patient_id", "string", { required: true, indexed: true }),
    f("practitioner_id", "string", { required: true }),
    f("details", "json", { required: true }),
    f("status", "string"),
  ],
};

const drugRegister: ExtensionEntity = {
  name: "drug_register",
  fields: [
    f("name", "string", { required: true }),
    f("batch_number", "string", { required: true }),
    f("expiry_date", "datetime"),
    f("is_controlled", "boolean"),
    f("quantity", "int"),
  ],
};

const medicalEncounters: ExtensionEntity = {
  name: "medical_encounter",
  fields: [
    f("patient_id", "string", { required: true, indexed: true }),
    f("practitioner_id", "string", { required: true }),
    f("diagnosis", "text", { required: true }),
    f("treatment_code", "string", { required: true }),
    f("claim_status", "string"),
    f("billing_amount", "decimal"),
  ],
};

const phiAccessLogs: ExtensionEntity = {
  name: "phi_access_log",
  fields: [
    f("user_id", "string", { required: true }),
    f("patient_id", "string", { required: true, indexed: true }),
    f("action", "string", { required: true }),
  ],
};

/** Custom-record schemas the "smart" services operate on. */
const coverageRecords: ExtensionEntity = {
  name: "coverage",
  fields: [
    f("patient_mrn", "string", { required: true, indexed: true }),
    f("payer", "string", { required: true }),
    f("member_id", "string"),
    f("group_no", "string"),
    f("copay", "decimal"),
    f("deductible", "decimal"),
    f("active", "boolean"),
  ],
};

const medicationRecords: ExtensionEntity = {
  name: "medication",
  fields: [
    f("patient_mrn", "string", { required: true, indexed: true }),
    f("drug", "string", { required: true }),
    f("status", "string"),
  ],
};

const allergyRecords: ExtensionEntity = {
  name: "allergy",
  fields: [
    f("patient_mrn", "string", { required: true, indexed: true }),
    f("allergen", "string"),
  ],
};

const problemRecords: ExtensionEntity = {
  name: "problem",
  fields: [
    f("patient_mrn", "string", { required: true, indexed: true }),
    f("description", "text"),
  ],
};

const labResultRecords: ExtensionEntity = {
  name: "lab_result",
  fields: [
    f("patient_mrn", "string", { required: true, indexed: true }),
    f("test_name", "string"),
    f("loinc_code", "string"),
    f("value", "decimal"),
    f("unit", "string"),
    f("flag", "string"),
    f("resulted_at", "datetime"),
  ],
};

const vitalRecords: ExtensionEntity = {
  name: "vital",
  fields: [
    f("patient_mrn", "string", { required: true, indexed: true }),
    f("systolic", "int"),
    f("diastolic", "int"),
    f("recorded_at", "datetime"),
  ],
};

const immunizationRecords: ExtensionEntity = {
  name: "immunization_record",
  fields: [
    f("patient_mrn", "string", { required: true, indexed: true }),
    f("vaccine", "string"),
  ],
};

export const healthcareSchema: ExtensionSchema = {
  entities: [
    patients,
    practitioners,
    appointments,
    prescriptions,
    drugRegister,
    medicalEncounters,
    phiAccessLogs,
    coverageRecords,
    medicationRecords,
    allergyRecords,
    problemRecords,
    labResultRecords,
    vitalRecords,
    immunizationRecords,
  ],
};
