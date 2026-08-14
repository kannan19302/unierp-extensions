import { StudentRecord, CourseRecord, FeeStructureRecord } from "./core";

/**
 * Education CRUD logic ported from `unierp-app-education/src/education.service.ts`
 * (E26) as pure functions over in-memory records. Fee money is kept as a number
 * at the domain boundary and declared `decimal` (Decimal(19,4)) in the schema;
 * the archived service used Decimal columns for amount/balance.
 */

export interface StudentFeeRecord {
  id: string;
  tenantId: string;
  studentId: string;
  feeStructureId: string;
  amountPaid: number;
  balance: number;
  status: "PAID" | "PARTIAL" | "UNPAID";
  createdAt: Date;
  student?: StudentRecord | null;
  feeStructure?: FeeStructureRecord | null;
}

export interface BookRegisterRecord {
  id: string;
  tenantId: string;
  title: string;
  isbn: string;
  author: string;
  quantity: number;
  available: number;
}

export interface BookTransactionRecord {
  id: string;
  tenantId: string;
  studentId: string;
  bookId: string;
  checkoutDate: Date;
  dueDate: Date;
  returnDate?: Date | null;
  fineAmount: number;
  status: "ISSUED" | "RETURNED" | "OVERDUE";
  createdAt: Date;
  student?: StudentRecord | null;
  book?: BookRegisterRecord | null;
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

function tenantOf<T extends { tenantId: string }>(rows: T[], tenantId: string): T[] {
  return rows.filter((r) => r.tenantId === tenantId);
}

export function getStudents(students: StudentRecord[], tenantId: string): StudentRecord[] {
  return tenantOf(students, tenantId).sort((a, b) => a.enrollmentNumber.localeCompare(b.enrollmentNumber));
}

export function createStudent(
  students: StudentRecord[],
  tenantId: string,
  dto: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    enrollmentNumber: string;
    parentContact: string;
  },
): StudentRecord {
  return {
    id: `stu_${students.length + 1}`,
    tenantId,
    firstName: dto.firstName,
    lastName: dto.lastName,
    dateOfBirth: new Date(dto.dateOfBirth),
    enrollmentNumber: dto.enrollmentNumber,
    parentContact: JSON.parse(dto.parentContact),
    status: "ACTIVE",
  };
}

export function getCourses(courses: CourseRecord[], tenantId: string): CourseRecord[] {
  return tenantOf(courses, tenantId).sort((a, b) => a.code.localeCompare(b.code));
}

export function createCourse(
  courses: CourseRecord[],
  tenantId: string,
  dto: { name: string; code: string; credits: number; description?: string },
): CourseRecord {
  return {
    id: `crs_${courses.length + 1}`,
    tenantId,
    name: dto.name,
    code: dto.code,
    credits: dto.credits,
    description: dto.description,
    status: "ACTIVE",
  };
}

export interface TimetableRecord {
  id: string;
  tenantId: string;
  courseId: string;
  room: string;
  weekday: string;
  startTime: string;
  endTime: string;
  instructorId: string;
  course?: CourseRecord | null;
}

export function getTimetables(
  timetables: TimetableRecord[],
  tenantId: string,
): TimetableRecord[] {
  return tenantOf(timetables, tenantId).sort((a, b) => a.weekday.localeCompare(b.weekday));
}

export function createTimetable(
  timetables: TimetableRecord[],
  tenantId: string,
  dto: {
    courseId: string;
    room: string;
    weekday: string;
    startTime: string;
    endTime: string;
    instructorId: string;
  },
): TimetableRecord {
  return {
    id: `tt_${timetables.length + 1}`,
    tenantId,
    courseId: dto.courseId,
    room: dto.room,
    weekday: dto.weekday,
    startTime: dto.startTime,
    endTime: dto.endTime,
    instructorId: dto.instructorId,
  };
}

export function getFeeStructures(
  feeStructures: FeeStructureRecord[],
  tenantId: string,
): FeeStructureRecord[] {
  return tenantOf(feeStructures, tenantId).sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}

export function createFeeStructure(
  feeStructures: FeeStructureRecord[],
  tenantId: string,
  dto: { name: string; description?: string; amount: number; dueDate: string },
): FeeStructureRecord {
  return {
    id: `fee_${feeStructures.length + 1}`,
    tenantId,
    name: dto.name,
    description: dto.description,
    amount: dto.amount,
    dueDate: new Date(dto.dueDate),
  };
}

export function getStudentFees(
  fees: StudentFeeRecord[],
  tenantId: string,
): StudentFeeRecord[] {
  return tenantOf(fees, tenantId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function payStudentFee(
  fees: StudentFeeRecord[],
  tenantId: string,
  dto: { studentFeeId: string; paymentAmount: number },
): StudentFeeRecord {
  const fee = fees.find((fs) => fs.id === dto.studentFeeId && fs.tenantId === tenantId);
  if (!fee) throw new NotFoundError("Fee record not found");

  const newAmountPaid = Number(fee.amountPaid) + dto.paymentAmount;
  const newBalance = Number(fee.balance) - dto.paymentAmount;
  const status: StudentFeeRecord["status"] = newBalance <= 0 ? "PAID" : "PARTIAL";

  return {
    ...fee,
    amountPaid: newAmountPaid,
    balance: newBalance < 0 ? 0 : newBalance,
    status,
  };
}

export function getBookRegister(
  books: BookRegisterRecord[],
  tenantId: string,
): BookRegisterRecord[] {
  return tenantOf(books, tenantId).sort((a, b) => a.title.localeCompare(b.title));
}

export function createBook(
  books: BookRegisterRecord[],
  tenantId: string,
  dto: { title: string; isbn: string; author: string; quantity: number },
): BookRegisterRecord {
  return {
    id: `bk_${books.length + 1}`,
    tenantId,
    title: dto.title,
    isbn: dto.isbn,
    author: dto.author,
    quantity: dto.quantity,
    available: dto.quantity,
  };
}

export function getBookTransactions(
  txns: BookTransactionRecord[],
  tenantId: string,
): BookTransactionRecord[] {
  return tenantOf(txns, tenantId).sort((a, b) => b.checkoutDate.getTime() - a.checkoutDate.getTime());
}

export function checkoutBook(
  books: BookRegisterRecord[],
  txns: BookTransactionRecord[],
  tenantId: string,
  dto: { studentId: string; bookId: string; dueDate: string },
): BookTransactionRecord {
  const book = books.find((b) => b.id === dto.bookId);
  if (!book || book.available <= 0) {
    throw new NotFoundError("Book is not available for checkout");
  }

  book.available -= 1;

  const txn: BookTransactionRecord = {
    id: `bktx_${txns.length + 1}`,
    tenantId,
    studentId: dto.studentId,
    bookId: dto.bookId,
    checkoutDate: new Date(),
    dueDate: new Date(dto.dueDate),
    fineAmount: 0,
    status: "ISSUED",
    createdAt: new Date(),
  };
  return txn;
}

export function returnBook(
  books: BookRegisterRecord[],
  txns: BookTransactionRecord[],
  tenantId: string,
  dto: { transactionId: string },
): BookTransactionRecord {
  const txn = txns.find((t) => t.id === dto.transactionId && t.tenantId === tenantId);
  if (!txn || txn.status === "RETURNED") {
    throw new NotFoundError("Transaction invalid or already returned");
  }

  const book = books.find((b) => b.id === txn.bookId);
  if (book) book.available += 1;

  return { ...txn, returnDate: new Date(), status: "RETURNED" };
}
