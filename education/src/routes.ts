import type {
  Extension,
  ExtensionRequest,
  ExtensionResponse,
} from "@kannan19302/extension-api";
import {
  enrolStudent,
  generateFeeInvoice,
  getStudentTranscript,
  recordAttendance,
  recordGrade,
} from "./core";
import {
  checkoutBook,
  createBook,
  createCourse,
  createFeeStructure,
  createStudent,
  createTimetable,
  getBookRegister,
  getBookTransactions,
  getCourses,
  getFeeStructures,
  getStudentFees,
  getStudents,
  getTimetables,
  payStudentFee,
  returnBook,
} from "./crud";

/**
 * Route wiring for the Education extension (E26). Every archived controller
 * endpoint from `unierp-app-education` maps to one handler here. Record sets
 * arrive in the request body (`records`) from the platform; tenant identity is
 * the platform's, never taken from the client.
 */

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
    const status =
      err instanceof Error && (err.name === "NotFoundError" || err.name === "BadRequestError")
        ? 400
        : 500;
    res.status?.(status);
    res.json({ error: err instanceof Error ? err.message : String(err) });
  }
}

export const educationRoutes: NonNullable<Extension["customRoutes"]> = {
  // ── CRUD (education.controller.ts) ──
  "/students": async (req, res) => {
    const records = readRecords(req.body);
    const students = (records.student ?? []) as never[];
    if (req.query?.__create === "1") {
      await handle(() => createStudent(students, "", { ...(req.body as Record<string, string>) } as never), req, res);
      return;
    }
    await handle(() => getStudents(students, ""), req, res);
  },

  "/courses": async (req, res) => {
    const records = readRecords(req.body);
    const courses = (records.course ?? []) as never[];
    if (req.query?.__create === "1") {
      await handle(() => createCourse(courses, "", { ...(req.body as Record<string, string>) } as never), req, res);
      return;
    }
    await handle(() => getCourses(courses, ""), req, res);
  },

  "/timetables": async (req, res) => {
    const records = readRecords(req.body);
    const timetables = (records.timetable ?? []) as never[];
    if (req.query?.__create === "1") {
      await handle(() => createTimetable(timetables, "", { ...(req.body as Record<string, string>) } as never), req, res);
      return;
    }
    await handle(() => getTimetables(timetables, ""), req, res);
  },

  "/fee-structures": async (req, res) => {
    const records = readRecords(req.body);
    const feeStructures = (records.fee_structure ?? []) as never[];
    if (req.query?.__create === "1") {
      await handle(() => createFeeStructure(feeStructures, "", { ...(req.body as Record<string, string>) } as never), req, res);
      return;
    }
    await handle(() => getFeeStructures(feeStructures, ""), req, res);
  },

  "/student-fees": async (req, res) => {
    const records = readRecords(req.body);
    const fees = (records.student_fee ?? []) as never[];
    await handle(() => getStudentFees(fees, ""), req, res);
  },

  "/student-fees/pay": async (req, res) => {
    const records = readRecords(req.body);
    const fees = (records.student_fee ?? []) as never[];
    const dto = (req.body ?? {}) as { studentFeeId?: string; paymentAmount?: number };
    await handle(() => payStudentFee(fees, "", { studentFeeId: dto?.studentFeeId ?? "", paymentAmount: dto?.paymentAmount ?? 0 }), req, res);
  },

  "/books": async (req, res) => {
    const records = readRecords(req.body);
    const books = (records.book_register ?? []) as never[];
    if (req.query?.__create === "1") {
      await handle(() => createBook(books, "", { ...(req.body as Record<string, string>) } as never), req, res);
      return;
    }
    await handle(() => getBookRegister(books, ""), req, res);
  },

  "/book-transactions": async (req, res) => {
    const records = readRecords(req.body);
    const txns = (records.book_transaction ?? []) as never[];
    await handle(() => getBookTransactions(txns, ""), req, res);
  },

  "/books/checkout": async (req, res) => {
    const records = readRecords(req.body);
    const books = (records.book_register ?? []) as never[];
    const txns = (records.book_transaction ?? []) as never[];
    const dto = (req.body ?? {}) as { studentId?: string; bookId?: string; dueDate?: string };
    await handle(
      () => checkoutBook(books, txns, "", { studentId: dto?.studentId ?? "", bookId: dto?.bookId ?? "", dueDate: dto?.dueDate ?? "" }),
      req,
      res,
    );
  },

  "/books/return": async (req, res) => {
    const records = readRecords(req.body);
    const books = (records.book_register ?? []) as never[];
    const txns = (records.book_transaction ?? []) as never[];
    const dto = (req.body ?? {}) as { transactionId?: string };
    await handle(() => returnBook(books, txns, "", { transactionId: dto?.transactionId ?? "" }), req, res);
  },

  // ── Core academic (education-core.controller.ts) ──
  "/core/enrol": async (req, res) => {
    const records = readRecords(req.body);
    const students = (records.student ?? []) as never[];
    const courses = (records.course ?? []) as never[];
    const dto = (req.body ?? {}) as { studentId?: string; courseId?: string; academicYear?: string };
    await handle(
      () => enrolStudent(students, courses, "", { studentId: dto?.studentId ?? "", courseId: dto?.courseId ?? "", academicYear: dto?.academicYear ?? "" }),
      req,
      res,
    );
  },

  "/core/grades": async (req, res) => {
    const dto = (req.body ?? {}) as Record<string, never>;
    await handle(() => recordGrade("", dto as never), req, res);
  },

  "/core/transcript/:studentId": async (req, res) => {
    const records = readRecords(req.body);
    const students = (records.student ?? []) as never[];
    const courses = (records.course ?? []) as never[];
    await handle(() => getStudentTranscript(students, courses, "", req.params?.studentId ?? ""), req, res);
  },

  "/core/attendance": async (req, res) => {
    const dto = (req.body ?? {}) as Record<string, never>;
    await handle(() => recordAttendance("", dto as never), req, res);
  },

  "/core/fees/invoice": async (req, res) => {
    const records = readRecords(req.body);
    const students = (records.student ?? []) as never[];
    const feeStructures = (records.fee_structure ?? []) as never[];
    const dto = (req.body ?? {}) as { studentId?: string; feeStructureId?: string };
    await handle(
      () => generateFeeInvoice(students, feeStructures, "", dto?.studentId ?? "", dto?.feeStructureId ?? ""),
      req,
      res,
    );
  },
};