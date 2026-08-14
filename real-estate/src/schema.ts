import type {
  ExtensionEntity,
  ExtensionField,
  ExtensionSchema,
} from "@kannan19302/extension-api";

/**
 * Declared data model for the Real Estate extension.
 * Ported from `unierp-app-realestate/prisma/schema.prisma` (E26). All money
 * fields (rent, security deposit, maintenance cost, commission) are `decimal`
 * (Decimal(15,2) → Decimal(19,4)); the lease-accounting arithmetic rounds to
 * cents exactly like the archived service.
 */

function f(
  name: string,
  type: ExtensionField["type"],
  opts: { required?: boolean; indexed?: boolean } = {},
): ExtensionField {
  return { name, type, required: opts.required ?? false, indexed: opts.indexed ?? false };
}

const properties: ExtensionEntity = {
  name: "property",
  fields: [
    f("name", "string", { required: true }),
    f("type", "string"),
    f("portfolio", "string"),
    f("address", "json"),
    f("parent_id", "string", { indexed: true }),
    f("status", "string"),
  ],
};

const leases: ExtensionEntity = {
  name: "lease",
  fields: [
    f("property_id", "string", { required: true, indexed: true }),
    f("tenant_name", "string", { required: true }),
    f("start_date", "datetime", { required: true }),
    f("end_date", "datetime", { required: true }),
    f("rent_amount", "decimal", { required: true }),
    f("security_deposit", "decimal", { required: true }),
    f("billing_frequency", "string"),
    f("status", "string"),
  ],
};

const propertyMaintenances: ExtensionEntity = {
  name: "property_maintenance",
  fields: [
    f("property_id", "string", { required: true, indexed: true }),
    f("description", "text", { required: true }),
    f("status", "string"),
    f("vendor_id", "string"),
    f("cost", "decimal"),
  ],
};

const agentCommissions: ExtensionEntity = {
  name: "agent_commission",
  fields: [
    f("agent_id", "string", { required: true, indexed: true }),
    f("amount", "decimal", { required: true }),
    f("split_ratio", "decimal"),
    f("general_ledger_ref", "string"),
    f("status", "string"),
  ],
};

export const realEstateSchema: ExtensionSchema = {
  entities: [properties, leases, propertyMaintenances, agentCommissions],
};