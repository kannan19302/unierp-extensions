import type {
  ExtensionEntity,
  ExtensionField,
  ExtensionSchema,
} from "@kannan19302/extension-api";

/**
 * Declared data model for the Field Service extension.
 * Ported from `unierp-app-fieldservice/prisma/schema.prisma` (E26). Field
 * service data is service-owned; references to core entities (technicians)
 * are by ID only. No money fields, so no decimal columns.
 */

function f(
  name: string,
  type: ExtensionField["type"],
  opts: { required?: boolean; indexed?: boolean } = {},
): ExtensionField {
  return { name, type, required: opts.required ?? false, indexed: opts.indexed ?? false };
}

const serviceTickets: ExtensionEntity = {
  name: "service_ticket",
  fields: [
    f("title", "string", { required: true }),
    f("customer_name", "string", { required: true }),
    f("description", "text"),
    f("priority", "string"),
    f("sla_deadline", "datetime", { required: true }),
    f("status", "string"),
  ],
};

const serviceDispatches: ExtensionEntity = {
  name: "service_dispatch",
  fields: [
    f("ticket_id", "string", { required: true, indexed: true }),
    f("technician_id", "string", { required: true }),
    f("scheduled_time", "datetime", { required: true }),
    f("route_details", "json"),
    f("status", "string"),
  ],
};

const technicianChecklists: ExtensionEntity = {
  name: "technician_checklist",
  fields: [
    f("dispatch_id", "string", { required: true, indexed: true }),
    f("items", "json"),
    f("signature_url", "string"),
    f("is_offline_synced", "boolean"),
  ],
};

const preventativeMaintenances: ExtensionEntity = {
  name: "preventative_maintenance",
  fields: [
    f("customer_name", "string", { required: true }),
    f("description", "text"),
    f("recurrence_cron", "string"),
    f("next_run_date", "datetime", { required: true }),
    f("status", "string"),
  ],
};

export const fieldServiceSchema: ExtensionSchema = {
  entities: [serviceTickets, serviceDispatches, technicianChecklists, preventativeMaintenances],
};
