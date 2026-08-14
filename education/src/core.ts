/**
 * Education "core" academic logic ported from
 * `unierp-app-education/src/education-core.service.ts` (E26): enrolment,
 * grade recording with letter-grade mapping, transcripts, attendance roll-up
 * and fee invoice generation — as pure functions over in-memory records.
 */

export interface StudentRecord {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  enrollmentNumber: string;
  status: string;
  parentContact?: unknown;
}

export interface CourseRecord {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  credits: number;
  description?: string | null;
  status: string;
}

export interface FeeStructureRecord {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
  amount: number;
  dueDate: Date;
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

export function enrolStudent(
  students: StudentRecord[],
  courses: CourseRecord[],
  tenantId: string,
  dto: { studentId: string; courseId: string; academicYear: string },
) {
  const student = students.find((s) => s.id === dto.studentId && s.tenantId === tenantId);
  if (!student) throw new NotFoundError("Student not found");
  const course = courses.find((c) => c.id === dto.courseId && c.tenantId === tenantId);
  if (!course) throw new NotFoundError("Course not found");

  return {
    studentId: dto.studentId,
    courseId: dto.courseId,
    academicYear: dto.academicYear,
    status: "ACTIVE",
    enrolmentDate: new Date().toISOString(),
  };
}

export interface GradeDto {
  studentId: string;
  courseId: string;
  assessmentType: string;
  assessmentName: string;
  maxScore: number;
  score: number;
  date: string;
}

export function recordGrade(_tenantId: string, dto: GradeDto) {
  if (dto.score > dto.maxScore) throw new BadRequestError("Score cannot exceed max score");
  const pct = (dto.score / dto.maxScore) * 100;
  return {
    studentId: dto.studentId,
    courseId: dto.courseId,
    score: dto.score,
    maxScore: dto.maxScore,
    percentage: Math.round(pct * 10) / 10,
    letterGrade: letterGrade(pct),
  };
}

/** Archived letter-grade band mapping (education-core.service.ts, private). */
export function letterGrade(pct: number): string {
  if (pct >= 93) return "A";
  if (pct >= 90) return "A-";
  if (pct >= 87) return "B+";
  if (pct >= 83) return "B";
  if (pct >= 80) return "B-";
  if (pct >= 77) return "C+";
  if (pct >= 73) return "C";
  if (pct >= 70) return "C-";
  if (pct >= 60) return "D";
  return "F";
}

export function getStudentTranscript(
  students: StudentRecord[],
  courses: CourseRecord[],
  tenantId: string,
  studentId: string,
) {
  const student = students.find((s) => s.id === studentId && s.tenantId === tenantId);
  if (!student) throw new NotFoundError("Student not found");

  return {
    student: { id: student.id, firstName: student.firstName, lastName: student.lastName },
    courses: courses.map((c) => ({ courseId: c.id, courseName: c.name })),
  };
}

export interface AttendanceRecordDto {
  courseId: string;
  date: string;
  records: Array<{ studentId: string; status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" }>;
}

export function recordAttendance(_tenantId: string, dto: AttendanceRecordDto) {
  return {
    courseId: dto.courseId,
    date: dto.date,
    totalRecords: dto.records.length,
    present: dto.records.filter((r) => r.status === "PRESENT").length,
    absent: dto.records.filter((r) => r.status === "ABSENT").length,
  };
}

export function generateFeeInvoice(
  students: StudentRecord[],
  feeStructures: FeeStructureRecord[],
  tenantId: string,
  studentId: string,
  feeStructureId: string,
) {
  const student = students.find((s) => s.id === studentId && s.tenantId === tenantId);
  if (!student) throw new NotFoundError("Student not found");
  const fee = feeStructures.find((fs) => fs.id === feeStructureId && fs.tenantId === tenantId);
  if (!fee) throw new NotFoundError("Fee structure not found");

  return {
    studentId,
    feeStructureId,
    amount: Number(fee.amount),
    dueDate: fee.dueDate,
    status: "PENDING",
  };
}
