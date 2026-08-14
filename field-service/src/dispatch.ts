/**
 * Dispatch logic ported from `unierp-app-fieldservice/src/dispatch.service.ts`
 * (E26): dispatch board, technician assignment, status transitions (with
 * ticket resolution), SLA status and upcoming preventative maintenance — as
 * pure functions over in-memory records.
 */

export interface ServiceTicketRecord {
  id: string;
  tenantId: string;
  title: string;
  customerName: string;
  description: string;
  priority: string;
  slaDeadline: Date;
  status: string;
}

export interface ServiceDispatchRecord {
  id: string;
  tenantId: string;
  ticketId: string;
  technicianId: string;
  scheduledTime: Date;
  routeDetails?: unknown;
  status: string;
  ticket?: ServiceTicketRecord | null;
}

export interface PreventativeMaintenanceRecord {
  id: string;
  tenantId: string;
  customerName: string;
  description: string;
  recurrenceCron: string;
  nextRunDate: Date;
  status: string;
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

export function getDispatchBoard(
  tickets: ServiceTicketRecord[],
  dispatches: ServiceDispatchRecord[],
  tenantId: string,
  date?: string,
) {
  const targetDate = date ? new Date(date) : new Date();
  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(targetDate);
  dayEnd.setHours(23, 59, 59, 999);

  const open = tenantOf(tickets, tenantId).filter((t) =>
    ["OPEN", "ASSIGNED", "IN_PROGRESS"].includes(t.status),
  );
  const scoped = tenantOf(dispatches, tenantId);
  const dayDispatches = scoped.filter(
    (d) => d.scheduledTime >= dayStart && d.scheduledTime <= dayEnd,
  );

  const dispatchedTicketIds = new Set(dayDispatches.map((d) => d.ticketId));
  const unassigned = open.filter((t) => !dispatchedTicketIds.has(t.id));

  return {
    date: dayStart.toISOString().slice(0, 10),
    totalTickets: open.length,
    dispatched: dayDispatches.length,
    unassigned: unassigned.length,
    dispatches: dayDispatches.map((d) => ({
      id: d.id,
      ticketId: d.ticketId,
      technicianId: d.technicianId,
      scheduledTime: d.scheduledTime,
      status: d.status,
    })),
    unassignedTickets: unassigned.map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      status: t.status,
      customerName: t.customerName,
    })),
  };
}

export function assignTechnician(
  tickets: ServiceTicketRecord[],
  dispatches: ServiceDispatchRecord[],
  tenantId: string,
  dto: { ticketId: string; technicianId: string; scheduledTime: string; notes?: string },
): ServiceDispatchRecord {
  const ticket = tenantOf(tickets, tenantId).find((t) => t.id === dto.ticketId);
  if (!ticket) throw new NotFoundError("Service ticket not found");

  const dispatch: ServiceDispatchRecord = {
    id: `disp_${dispatches.length + 1}`,
    tenantId,
    ticketId: dto.ticketId,
    technicianId: dto.technicianId,
    scheduledTime: new Date(dto.scheduledTime),
    routeDetails: { notes: dto.notes || "" },
    status: "ASSIGNED",
  };
  ticket.status = "ASSIGNED";
  return dispatch;
}

export function updateDispatchStatus(
  dispatches: ServiceDispatchRecord[],
  tenantId: string,
  dispatchId: string,
  status: string,
): ServiceDispatchRecord {
  const dispatch = tenantOf(dispatches, tenantId).find((d) => d.id === dispatchId);
  if (!dispatch) throw new NotFoundError("Dispatch not found");

  if (status === "COMPLETED") {
    const ticket = dispatch.ticket;
    if (ticket) ticket.status = "RESOLVED";
  }
  return { ...dispatch, status };
}

export interface SlaResult {
  ticketId: string;
  title: string;
  priority: string;
  slaDeadline: Date;
  remainingHours: number;
  breached: boolean;
}

export function getSlaStatus(tickets: ServiceTicketRecord[], tenantId: string) {
  const open = tenantOf(tickets, tenantId).filter((t) => !["RESOLVED", "CLOSED"].includes(t.status));
  const now = new Date();

  const results: SlaResult[] = open.map((t) => {
    const deadline = new Date(t.slaDeadline);
    const breached = now > deadline;
    const remainingHours = Math.max(0, (deadline.getTime() - now.getTime()) / (1000 * 60 * 60));
    return {
      ticketId: t.id,
      title: t.title,
      priority: t.priority,
      slaDeadline: t.slaDeadline,
      remainingHours: Math.round(remainingHours * 10) / 10,
      breached,
    };
  });

  return {
    totalOpen: open.length,
    breached: results.filter((r) => r.breached).length,
    atRisk: results.filter((r) => !r.breached && r.remainingHours < 2).length,
    tickets: results,
  };
}

export function getUpcomingPM(
  pmRecords: PreventativeMaintenanceRecord[],
  tenantId: string,
  withinDays = 30,
) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + withinDays);

  const due = tenantOf(pmRecords, tenantId)
    .filter((pm) => pm.nextRunDate <= cutoff && pm.status !== "COMPLETED")
    .sort((a, b) => a.nextRunDate.getTime() - b.nextRunDate.getTime());

  return due.map((pm) => ({
    id: pm.id,
    customerName: pm.customerName,
    description: pm.description,
    nextRunDate: pm.nextRunDate,
    recurrenceCron: pm.recurrenceCron,
    overdue: new Date(pm.nextRunDate) < new Date(),
  }));
}
