import {
  buildPaginationValues,
  buildOrderBy,
  paginatedResult,
  PaginationParams,
  PaginatedResult,
} from "./pagination";

/**
 * Healthcare CRUD logic ported from `unierp-app-healthcare/src/healthcare.service.ts`
 * (E26). The archived service used Prisma models scoped to a tenant; here the
 * same operations run as pure functions over the in-memory record sets for the
 * extension's declared schema entities. Tenant scoping is applied by filtering
 * on the caller-provided tenantId (the platform re-derives the tenant at the
 * isolate boundary at runtime; the extension never accepts it as authority).
 */

export interface PatientRecord {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: string;
  email?: string | null;
  phone?: string | null;
  medicalHistory?: unknown | null;
  vitalsHistory?: unknown | null;
  allergies?: unknown | null;
  status: string;
}

export interface PractitionerRecord {
  id: string;
  tenantId: string;
  employeeId: string;
  specialty: string;
  licenseNumber: string;
  status: string;
}

export interface AppointmentRecord {
  id: string;
  tenantId: string;
  patientId: string;
  practitionerId: string;
  startTime: Date;
  endTime: Date;
  status: string;
  notes?: string | null;
  patient?: PatientRecord | null;
  practitioner?: PractitionerRecord | null;
}

export interface PrescriptionRecord {
  id: string;
  tenantId: string;
  patientId: string;
  practitionerId: string;
  details: unknown;
  status: string;
  createdAt: Date;
  patient?: PatientRecord | null;
  practitioner?: PractitionerRecord | null;
}

export interface DrugRegisterRecord {
  id: string;
  tenantId: string;
  name: string;
  batchNumber: string;
  expiryDate: Date;
  isControlled: boolean;
  quantity: number;
}

export interface MedicalEncounterRecord {
  id: string;
  tenantId: string;
  patientId: string;
  practitionerId: string;
  diagnosis: string;
  treatmentCode: string;
  claimStatus: string;
  billingAmount: number;
  createdAt: Date;
  patient?: PatientRecord | null;
  practitioner?: PractitionerRecord | null;
}

export type SortKey = "asc" | "desc";

function tenantOf<T extends { tenantId: string }>(rows: T[], tenantId: string): T[] {
  return rows.filter((r) => r.tenantId === tenantId);
}

function sortedByDate<T extends { createdAt: Date }>(
  rows: T[],
  dir: "asc" | "desc",
): T[] {
  return [...rows].sort((a, b) =>
    dir === "asc"
      ? a.createdAt.getTime() - b.createdAt.getTime()
      : b.createdAt.getTime() - a.createdAt.getTime(),
  );
}

export function getPatients(
  patients: PatientRecord[],
  tenantId: string,
  params: PaginationParams & { search?: string } = {},
): PaginatedResult<PatientRecord> {
  let scoped = tenantOf(patients, tenantId);
  if (params.search) {
    const needle = params.search.toLowerCase();
    scoped = scoped.filter(
      (p) =>
        p.firstName.toLowerCase().includes(needle) ||
        p.lastName.toLowerCase().includes(needle) ||
        (p.email ?? "").toLowerCase().includes(needle),
    );
  }
  const { skip, take } = buildPaginationValues(params);
  const orderBy = buildOrderBy(params.sort);
  const first = orderBy[0];
  let sorted = scoped;
  if (first) {
    const [key, dir] = Object.entries(first)[0] ?? ["createdAt", "asc"];
    sorted = [...scoped].sort((a, b) => {
      const av = a[key as keyof PatientRecord];
      const bv = b[key as keyof PatientRecord];
      return String(av ?? "").localeCompare(String(bv ?? "")) * (dir === "asc" ? 1 : -1);
    });
  }
  return paginatedResult(sorted.slice(skip, skip + take), scoped.length, params);
}

export function createPatient(
  patients: PatientRecord[],
  tenantId: string,
  dto: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    email?: string;
    phone?: string;
    medicalHistory?: string;
    vitalsHistory?: string;
    allergies?: string;
  },
): PatientRecord {
  const record: PatientRecord = {
    id: `ptn_${patients.length + 1}`,
    tenantId,
    firstName: dto.firstName,
    lastName: dto.lastName,
    dateOfBirth: new Date(dto.dateOfBirth),
    gender: dto.gender,
    email: dto.email || null,
    phone: dto.phone || null,
    medicalHistory: dto.medicalHistory ? JSON.parse(dto.medicalHistory) : null,
    vitalsHistory: dto.vitalsHistory ? JSON.parse(dto.vitalsHistory) : null,
    allergies: dto.allergies ? JSON.parse(dto.allergies) : null,
    status: "ACTIVE",
  };
  return record;
}

export function getPractitioners(
  practitioners: PractitionerRecord[],
  tenantId: string,
  params: PaginationParams = {},
): PaginatedResult<PractitionerRecord> {
  const scoped = tenantOf(practitioners, tenantId);
  const { skip, take } = buildPaginationValues(params);
  const orderBy = buildOrderBy(params.sort);
  const first = orderBy[0];
  let sorted = scoped;
  if (first) {
    const [key, dir] = Object.entries(first)[0] ?? ["createdAt", "asc"];
    sorted = [...scoped].sort((a, b) =>
      String(a[key as keyof PractitionerRecord] ?? "").localeCompare(
        String(b[key as keyof PractitionerRecord] ?? ""),
      ) * (dir === "asc" ? 1 : -1),
    );
  }
  return paginatedResult(sorted.slice(skip, skip + take), scoped.length, params);
}

export function createPractitioner(
  practitioners: PractitionerRecord[],
  tenantId: string,
  dto: { employeeId: string; specialty: string; licenseNumber: string },
): PractitionerRecord {
  return {
    id: `prac_${practitioners.length + 1}`,
    tenantId,
    employeeId: dto.employeeId,
    specialty: dto.specialty,
    licenseNumber: dto.licenseNumber,
    status: "ACTIVE",
  };
}

export function getAppointments(
  appointments: AppointmentRecord[],
  tenantId: string,
): AppointmentRecord[] {
  return tenantOf(appointments, tenantId).sort(
    (a, b) => b.startTime.getTime() - a.startTime.getTime(),
  );
}

export function createAppointment(
  appointments: AppointmentRecord[],
  tenantId: string,
  dto: {
    patientId: string;
    practitionerId: string;
    startTime: string;
    endTime: string;
    notes?: string;
  },
): AppointmentRecord {
  return {
    id: `apt_${appointments.length + 1}`,
    tenantId,
    patientId: dto.patientId,
    practitionerId: dto.practitionerId,
    startTime: new Date(dto.startTime),
    endTime: new Date(dto.endTime),
    notes: dto.notes || null,
    status: "CONFIRMED",
  };
}

export function getPrescriptions(
  prescriptions: PrescriptionRecord[],
  tenantId: string,
): PrescriptionRecord[] {
  return sortedByDate(tenantOf(prescriptions, tenantId), "desc");
}

export function createPrescription(
  prescriptions: PrescriptionRecord[],
  tenantId: string,
  dto: { patientId: string; practitionerId: string; details: string },
): PrescriptionRecord {
  return {
    id: `rx_${prescriptions.length + 1}`,
    tenantId,
    patientId: dto.patientId,
    practitionerId: dto.practitionerId,
    details: JSON.parse(dto.details),
    status: "ACTIVE",
    createdAt: new Date(),
  };
}

export function getDrugRegister(
  drugRegister: DrugRegisterRecord[],
  tenantId: string,
): DrugRegisterRecord[] {
  return tenantOf(drugRegister, tenantId).sort((a, b) => a.name.localeCompare(b.name));
}

export function logDrugRegister(
  drugRegister: DrugRegisterRecord[],
  tenantId: string,
  dto: {
    name: string;
    batchNumber: string;
    expiryDate: string;
    isControlled?: boolean;
    quantity: number;
  },
): DrugRegisterRecord {
  return {
    id: `drug_${drugRegister.length + 1}`,
    tenantId,
    name: dto.name,
    batchNumber: dto.batchNumber,
    expiryDate: new Date(dto.expiryDate),
    isControlled: dto.isControlled ?? false,
    quantity: dto.quantity,
  };
}

export function getMedicalEncounters(
  encounters: MedicalEncounterRecord[],
  tenantId: string,
): MedicalEncounterRecord[] {
  return sortedByDate(tenantOf(encounters, tenantId), "desc");
}

export function createMedicalEncounter(
  encounters: MedicalEncounterRecord[],
  tenantId: string,
  dto: {
    patientId: string;
    practitionerId: string;
    diagnosis: string;
    treatmentCode: string;
    billingAmount: number;
  },
): MedicalEncounterRecord {
  return {
    id: `enc_${encounters.length + 1}`,
    tenantId,
    patientId: dto.patientId,
    practitionerId: dto.practitionerId,
    diagnosis: dto.diagnosis,
    treatmentCode: dto.treatmentCode,
    billingAmount: dto.billingAmount,
    claimStatus: "SUBMITTED",
    createdAt: new Date(),
  };
}
