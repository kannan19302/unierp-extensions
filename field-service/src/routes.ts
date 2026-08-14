import type {
  Extension,
  ExtensionRequest,
  ExtensionResponse,
} from "@kannan19302/extension-api";
import {
  assignTechnician,
  getDispatchBoard,
  getSlaStatus,
  getUpcomingPM,
  updateDispatchStatus,
} from "./dispatch";
import {
  createChecklist,
  createDispatch,
  createPreventativeMaintenance,
  createTicket,
  getChecklists,
  getDispatches,
  getPreventativeMaintenances,
  getTickets,
} from "./crud";

/**
 * Route wiring for the Field Service extension (E26). Every archived controller
 * endpoint from `unierp-app-fieldservice` maps to one handler here.
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
    res.status?.(err instanceof Error ? 400 : 500);
    res.json({ error: err instanceof Error ? err.message : String(err) });
  }
}

export const fieldServiceRoutes: NonNullable<Extension["customRoutes"]> = {
  // ── CRUD (field-service.controller.ts) ──
  "/tickets": async (req, res) => {
    const records = readRecords(req.body);
    const tickets = (records.service_ticket ?? []) as never[];
    if (req.query?.__create === "1") {
      await handle(() => createTicket(tickets, "", { ...(req.body as Record<string, string>) } as never), req, res);
      return;
    }
    await handle(() => getTickets(tickets, ""), req, res);
  },

  "/dispatches": async (req, res) => {
    const records = readRecords(req.body);
    const dispatches = (records.service_dispatch ?? []) as never[];
    if (req.query?.__create === "1") {
      await handle(() => createDispatch(dispatches, "", { ...(req.body as Record<string, string>) } as never), req, res);
      return;
    }
    await handle(() => getDispatches(dispatches, ""), req, res);
  },

  "/checklists": async (req, res) => {
    const records = readRecords(req.body);
    const checklists = (records.technician_checklist ?? []) as never[];
    if (req.query?.__create === "1") {
      await handle(() => createChecklist(checklists, "", { ...(req.body as Record<string, string>) } as never), req, res);
      return;
    }
    await handle(() => getChecklists(checklists, ""), req, res);
  },

  "/preventative": async (req, res) => {
    const records = readRecords(req.body);
    const pm = (records.preventative_maintenance ?? []) as never[];
    if (req.query?.__create === "1") {
      await handle(() => createPreventativeMaintenance(pm, "", { ...(req.body as Record<string, string>) } as never), req, res);
      return;
    }
    await handle(() => getPreventativeMaintenances(pm, ""), req, res);
  },

  // ── Dispatch (dispatch.controller.ts) ──
  "/dispatch/board": async (req, res) => {
    const records = readRecords(req.body);
    const tickets = (records.service_ticket ?? []) as never[];
    const dispatches = (records.service_dispatch ?? []) as never[];
    await handle(() => getDispatchBoard(tickets, dispatches, "", req.query?.date), req, res);
  },

  "/dispatch/assign": async (req, res) => {
    const records = readRecords(req.body);
    const tickets = (records.service_ticket ?? []) as never[];
    const dispatches = (records.service_dispatch ?? []) as never[];
    const dto = (req.body ?? {}) as { ticketId?: string; technicianId?: string; scheduledTime?: string; notes?: string };
    await handle(
      () => assignTechnician(tickets, dispatches, "", { ticketId: dto?.ticketId ?? "", technicianId: dto?.technicianId ?? "", scheduledTime: dto?.scheduledTime ?? "", notes: dto?.notes }),
      req,
      res,
    );
  },

  "/dispatch/:id/status": async (req, res) => {
    const records = readRecords(req.body);
    const dispatches = (records.service_dispatch ?? []) as never[];
    const dto = (req.body ?? {}) as { status?: string };
    await handle(() => updateDispatchStatus(dispatches, "", req.params?.id ?? "", dto?.status ?? ""), req, res);
  },

  "/dispatch/sla": async (req, res) => {
    const records = readRecords(req.body);
    const tickets = (records.service_ticket ?? []) as never[];
    await handle(() => getSlaStatus(tickets, ""), req, res);
  },

  "/dispatch/preventive-maintenance": async (req, res) => {
    const records = readRecords(req.body);
    const pm = (records.preventative_maintenance ?? []) as never[];
    const days = req.query?.days ? Number(req.query.days) : 30;
    await handle(() => getUpcomingPM(pm, "", days), req, res);
  },
};
