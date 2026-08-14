import {
  AppointmentRecord,
  MedicalEncounterRecord,
  PatientRecord,
  PractitionerRecord,
  PrescriptionRecord,
} from "./crud";

/**
 * Clinical services ported from `unierp-app-healthcare/src/clinical.service.ts`
 * (E26): patient summary, encounter-with-charting, prescription creation,
 * claim submission and FHIR export — as pure functions over the extension's
 * in-memory record sets. PHI access logging is retained as a first-class
 * audit record (phi_access_log schema entity).
 */

export interface PhiAccessRecord {
  id: string;
  tenantId: string;
  userId: string;
  patientId: string;
  action: string;
  createdAt: Date;
}

export interface PatientSummary {
  patient: PatientRecord;
  recentAppointments: AppointmentRecord[];
  activePrescriptions: PrescriptionRecord[];
  recentEncounters: MedicalEncounterRecord[];
}

export function getPatientSummary(
  records: {
    patients: PatientRecord[];
    appointments: AppointmentRecord[];
    prescriptions: PrescriptionRecord[];
    encounters: MedicalEncounterRecord[];
  },
  tenantId: string,
  patientId: string,
): PatientSummary {
  const patient = records.patients.find((p) => p.id === patientId && p.tenantId === tenantId);
  if (!patient) {
    throw new NotFoundError("Patient not found");
  }

  const appointments = records.appointments
    .filter((a) => a.tenantId === tenantId && a.patientId === patientId)
    .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
    .slice(0, 10);

  const prescriptions = records.prescriptions
    .filter((p) => p.tenantId === tenantId && p.patientId === patientId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 10);

  const encounters = records.encounters
    .filter((e) => e.tenantId === tenantId && e.patientId === patientId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 10);

  return {
    patient,
    recentAppointments: appointments,
    activePrescriptions: prescriptions.filter((p) => p.status === "ACTIVE"),
    recentEncounters: encounters,
  };
}

export interface EncounterChartingDto {
  patientId: string;
  practitionerId: string;
  diagnosis: string;
  treatmentCode: string;
  billingAmount: number;
  chiefComplaint?: string;
  soapNotes?: Record<string, string>;
}

export function createEncounterWithCharting(
  encounters: MedicalEncounterRecord[],
  patients: PatientRecord[],
  tenantId: string,
  dto: EncounterChartingDto,
): MedicalEncounterRecord {
  const patient = patients.find((p) => p.id === dto.patientId && p.tenantId === tenantId);
  if (!patient) {
    throw new NotFoundError("Patient not found");
  }
  return {
    id: `enc_${encounters.length + 1}`,
    tenantId,
    patientId: dto.patientId,
    practitionerId: dto.practitionerId,
    diagnosis: dto.diagnosis,
    treatmentCode: dto.treatmentCode,
    billingAmount: dto.billingAmount,
    claimStatus: "DRAFT",
    createdAt: new Date(),
  };
}

export interface PrescriptionDto {
  patientId: string;
  practitionerId: string;
  medications: Array<{
    drugName: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
  }>;
}

export function createClinicalPrescription(
  prescriptions: PrescriptionRecord[],
  patients: PatientRecord[],
  tenantId: string,
  dto: PrescriptionDto,
): PrescriptionRecord {
  const patient = patients.find((p) => p.id === dto.patientId && p.tenantId === tenantId);
  if (!patient) {
    throw new NotFoundError("Patient not found");
  }
  return {
    id: `rx_${prescriptions.length + 1}`,
    tenantId,
    patientId: dto.patientId,
    practitionerId: dto.practitionerId,
    details: dto.medications,
    status: "ACTIVE",
    createdAt: new Date(),
  };
}

export function submitClaim(
  encounters: MedicalEncounterRecord[],
  tenantId: string,
  encounterId: string,
): MedicalEncounterRecord {
  const encounter = encounters.find((e) => e.id === encounterId && e.tenantId === tenantId);
  if (!encounter) {
    throw new NotFoundError("Encounter not found");
  }
  return { ...encounter, claimStatus: "SUBMITTED" };
}

export interface FhirBundleEntry {
  resource: Record<string, unknown>;
}

export interface FhirCollectionBundle {
  resourceType: string;
  type: string;
  entry: FhirBundleEntry[];
}

export function exportPatientFhirBundle(
  records: {
    patients: PatientRecord[];
    encounters: MedicalEncounterRecord[];
    prescriptions: PrescriptionRecord[];
  },
  tenantId: string,
  patientId: string,
): FhirCollectionBundle {
  const patient = records.patients.find((p) => p.id === patientId && p.tenantId === tenantId);
  if (!patient) {
    throw new NotFoundError("Patient not found");
  }

  const encounters = records.encounters.filter((e) => e.tenantId === tenantId && e.patientId === patientId);
  const prescriptions = records.prescriptions.filter((p) => p.tenantId === tenantId && p.patientId === patientId);

  return {
    resourceType: "Bundle",
    type: "collection",
    entry: [
      {
        resource: {
          resourceType: "Patient",
          id: patient.id,
          name: [{ given: [patient.firstName], family: patient.lastName }],
        },
      },
      ...encounters.map((e) => ({
        resource: {
          resourceType: "Encounter",
          id: e.id,
          status: "finished",
          reasonCode: [{ text: e.diagnosis }],
          subject: { reference: `Patient/${patient.id}` },
        },
      })),
      ...prescriptions.map((rx) => ({
        resource: {
          resourceType: "MedicationRequest",
          id: rx.id,
          status: rx.status?.toLowerCase() || "active",
          subject: { reference: `Patient/${patient.id}` },
        },
      })),
    ],
  };
}

export function logPhiAccess(
  logs: PhiAccessRecord[],
  tenantId: string,
  userId: string,
  patientId: string,
  action: string,
): PhiAccessRecord {
  const record: PhiAccessRecord = {
    id: `phi_${logs.length + 1}`,
    tenantId,
    userId,
    patientId,
    action,
    createdAt: new Date(),
  };
  return record;
}

/** Domain error mirroring the archived NestJS NotFoundException semantics. */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

// Kept for type symmetry with the archived service surface (practitioner joins).
export type { PatientRecord, PractitionerRecord };
