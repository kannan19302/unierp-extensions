import { describe, expect, it } from "vitest";
import { ExtensionContext, Extension } from "@kannan19302/extension-api";
import factory, { manifest, educationRoutes } from "./index";
import {
  enrolStudent,
  generateFeeInvoice,
  getStudentTranscript,
  letterGrade,
  recordAttendance,
  recordGrade,
  NotFoundError as CoreNotFound,
} from "./core";
import {
  checkoutBook,
  createBook,
  createStudent,
  getBookRegister,
  payStudentFee,
  returnBook,
  StudentFeeRecord,
} from "./crud";

function ctx(tenantId: string): ExtensionContext {
  return { tenantId, api: { log: () => {} } };
}

function makeStudent(tenantId: string, id = "stu_1") {
  return createStudent([], tenantId, {
    firstName: "Ada",
    lastName: "Lovelace",
    dateOfBirth: "1815-12-10",
    enrollmentNumber: "ENR-001",
    parentContact: '{"name":"Mother"}',
  });
}

describe("education manifest", () => {
  it("declares a valid manifest", () => {
    expect(manifest.id).toBe("education");
    expect(manifest.schema?.entities.length).toBe(7);
  });

  it("factory returns extension with routes", () => {
    const ext: Extension = factory(ctx("t1"));
    expect(typeof ext.onInstall).toBe("function");
    expect(educationRoutes["/students"]).toBeTypeOf("function");
    expect(educationRoutes["/core/grades"]).toBeTypeOf("function");
  });
});

describe("grading", () => {
  it("maps percentage to archived letter bands", () => {
    expect(letterGrade(95)).toBe("A");
    expect(letterGrade(91)).toBe("A-");
    expect(letterGrade(84)).toBe("B");
    expect(letterGrade(61)).toBe("D");
    expect(letterGrade(40)).toBe("F");
  });

  it("records a grade with rounded percentage", () => {
    const g = recordGrade("t1", {
      studentId: "s1", courseId: "c1", assessmentType: "exam", assessmentName: "Midterm",
      maxScore: 100, score: 88, date: "2026-01-01",
    });
    expect(g.letterGrade).toBe("B+");
    expect(g.percentage).toBe(88);
  });

  it("rejects score above max", () => {
    expect(() => recordGrade("t1", { studentId: "s1", courseId: "c1", assessmentType: "exam", assessmentName: "x", maxScore: 10, score: 11, date: "d" })).toThrow();
  });
});

describe("enrolment and transcript", () => {
  it("enrols an existing student in an existing course", () => {
    const student = makeStudent("t1");
    const course = { id: "c1", tenantId: "t1", name: "Math", code: "M101", credits: 3, status: "ACTIVE" };
    const result = enrolStudent([student], [course], "t1", { studentId: student.id, courseId: "c1", academicYear: "2026" });
    expect(result.status).toBe("ACTIVE");
  });

  it("throws when student is unknown", () => {
    expect(() => enrolStudent([], [], "t1", { studentId: "nope", courseId: "c1", academicYear: "2026" })).toThrow(CoreNotFound);
  });

  it("builds a transcript", () => {
    const student = makeStudent("t1");
    const t = getStudentTranscript([student], [{ id: "c1", tenantId: "t1", name: "Math", code: "M101", credits: 3, status: "ACTIVE" }], "t1", student.id);
    expect(t.courses[0].courseName).toBe("Math");
  });
});

describe("attendance", () => {
  it("rolls up present/absent counts", () => {
    const r = recordAttendance("t1", {
      courseId: "c1",
      date: "2026-02-01",
      records: [
        { studentId: "s1", status: "PRESENT" },
        { studentId: "s2", status: "PRESENT" },
        { studentId: "s3", status: "ABSENT" },
        { studentId: "s4", status: "LATE" },
      ],
    });
    expect(r.present).toBe(2);
    expect(r.absent).toBe(1);
    expect(r.totalRecords).toBe(4);
  });
});

describe("fees", () => {
  it("generates a pending invoice with the fee amount", () => {
    const student = makeStudent("t1");
    const fee = { id: "f1", tenantId: "t1", name: "Tuition", amount: 1000, dueDate: new Date("2026-09-01") };
    const inv = generateFeeInvoice([student], [fee], "t1", student.id, "f1");
    expect(inv.amount).toBe(1000);
    expect(inv.status).toBe("PENDING");
  });

  it("applies a payment and transitions to PAID", () => {
    const fee: StudentFeeRecord = {
      id: "sf1", tenantId: "t1", studentId: "s1", feeStructureId: "f1",
      amountPaid: 0, balance: 1000, status: "UNPAID", createdAt: new Date(),
    };
    const paid = payStudentFee([fee], "t1", { studentFeeId: "sf1", paymentAmount: 1000 });
    expect(paid.status).toBe("PAID");
    expect(paid.balance).toBe(0);
  });
});

describe("library", () => {
  it("checkouts decrement availability and return restores it", () => {
    const book = createBook([], "t1", { title: "Principia", isbn: "1", author: "Newton", quantity: 1 });
    const txn = checkoutBook([book], [], "t1", { studentId: "s1", bookId: book.id, dueDate: "2026-03-01" });
    expect(txn.status).toBe("ISSUED");
    expect(book.available).toBe(0);
    const returned = returnBook([book], [txn], "t1", { transactionId: txn.id });
    expect(returned.status).toBe("RETURNED");
    expect(book.available).toBe(1);
  });

  it("rejects checkout when unavailable", () => {
    const book = createBook([], "t1", { title: "P", isbn: "2", author: "A", quantity: 1 });
    book.available = 0;
    expect(() => checkoutBook([book], [], "t1", { studentId: "s1", bookId: book.id, dueDate: "d" })).toThrow();
  });
});
