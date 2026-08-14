import type {
  ExtensionEntity,
  ExtensionField,
  ExtensionSchema,
} from "@kannan19302/extension-api";

/**
 * Declared data model for the Education extension.
 * Ported from `unierp-app-education/prisma/schema.prisma` (E26). Money fields
 * (fee amounts, balances, fines) are `decimal` (Decimal(19,4)) — never Float.
 */

function f(
  name: string,
  type: ExtensionField["type"],
  opts: { required?: boolean; indexed?: boolean } = {},
): ExtensionField {
  return { name, type, required: opts.required ?? false, indexed: opts.indexed ?? false };
}

const students: ExtensionEntity = {
  name: "student",
  fields: [
    f("first_name", "string", { required: true }),
    f("last_name", "string", { required: true }),
    f("date_of_birth", "datetime"),
    f("enrollment_number", "string", { required: true, indexed: true }),
    f("status", "string"),
    f("parent_contact", "json"),
  ],
};

const courses: ExtensionEntity = {
  name: "course",
  fields: [
    f("name", "string", { required: true }),
    f("code", "string", { required: true, indexed: true }),
    f("credits", "int"),
    f("description", "text"),
    f("status", "string"),
  ],
};

const timetables: ExtensionEntity = {
  name: "timetable",
  fields: [
    f("course_id", "string", { required: true, indexed: true }),
    f("room", "string"),
    f("weekday", "string"),
    f("start_time", "string"),
    f("end_time", "string"),
    f("instructor_id", "string"),
  ],
};

const feeStructures: ExtensionEntity = {
  name: "fee_structure",
  fields: [
    f("name", "string", { required: true }),
    f("description", "text"),
    f("amount", "decimal"),
    f("due_date", "datetime"),
  ],
};

const studentFees: ExtensionEntity = {
  name: "student_fee",
  fields: [
    f("student_id", "string", { required: true, indexed: true }),
    f("fee_structure_id", "string", { required: true }),
    f("amount_paid", "decimal"),
    f("balance", "decimal"),
    f("status", "string"),
  ],
};

const bookRegister: ExtensionEntity = {
  name: "book_register",
  fields: [
    f("title", "string", { required: true }),
    f("isbn", "string", { required: true, indexed: true }),
    f("author", "string"),
    f("quantity", "int"),
    f("available", "int"),
  ],
};

const bookTransactions: ExtensionEntity = {
  name: "book_transaction",
  fields: [
    f("student_id", "string", { required: true, indexed: true }),
    f("book_id", "string", { required: true }),
    f("checkout_date", "datetime"),
    f("due_date", "datetime"),
    f("return_date", "datetime"),
    f("fine_amount", "decimal"),
    f("status", "string"),
  ],
};

export const educationSchema: ExtensionSchema = {
  entities: [
    students,
    courses,
    timetables,
    feeStructures,
    studentFees,
    bookRegister,
    bookTransactions,
  ],
};
