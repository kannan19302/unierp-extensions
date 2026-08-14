import {
  PreventativeMaintenanceRecord,
  ServiceDispatchRecord,
  ServiceTicketRecord,
} from "./dispatch";

/**
 * Field Service CRUD logic ported from
 * `unierp-app-fieldservice/src/field-service.service.ts` (E26) as pure
 * functions over in-memory records.
 */

export interface TechnicianChecklistRecord {
  id: string;
  tenantId: string;
  dispatchId: string;
  items: unknown;
  signatureUrl?: string | null;
  isOfflineSynced: boolean;
  createdAt: Date;
  dispatch?: ServiceDispatchRecord | null;
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

export function getTickets(tickets: ServiceTicketRecord[], tenantId: string): ServiceTicketRecord[] {
  return tenantOf(tickets, tenantId).sort((a, b) => a.slaDeadline.getTime() - b.slaDeadline.getTime());
}

export function createTicket(
  tickets: ServiceTicketRecord[],
  tenantId: string,
  dto: { title: string; customerName: string; description: string; priority?: string; slaDeadline: string },
): ServiceTicketRecord {
  return {
    id: `tkt_${tickets.length + 1}`,
    tenantId,
    title: dto.title,
    customerName: dto.customerName,
    description: dto.description,
    priority: dto.priority ?? "MEDIUM",
    slaDeadline: new Date(dto.slaDeadline),
    status: "OPEN",
  };
}

export function getDispatches(
  dispatches: ServiceDispatchRecord[],
  tenantId: string,
): ServiceDispatchRecord[] {
  return tenantOf(dispatches, tenantId).sort((a, b) => b.scheduledTime.getTime() - a.scheduledTime.getTime());
}

export function createDispatch(
  dispatches: ServiceDispatchRecord[],
  tenantId: string,
  dto: { ticketId: string; technicianId: string; scheduledTime: string; routeDetails: string },
): ServiceDispatchRecord {
  return {
    id: `disp_${dispatches.length + 1}`,
    tenantId,
    ticketId: dto.ticketId,
    technicianId: dto.technicianId,
    scheduledTime: new Date(dto.scheduledTime),
    routeDetails: JSON.parse(dto.routeDetails),
    status: "ASSIGNED",
  };
}

export function getChecklists(
  checklists: TechnicianChecklistRecord[],
  tenantId: string,
): TechnicianChecklistRecord[] {
  return tenantOf(checklists, tenantId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function createChecklist(
  checklists: TechnicianChecklistRecord[],
  tenantId: string,
  dto: { dispatchId: string; items: string; signatureUrl?: string },
): TechnicianChecklistRecord {
  return {
    id: `chk_${checklists.length + 1}`,
    tenantId,
    dispatchId: dto.dispatchId,
    items: JSON.parse(dto.items),
    signatureUrl: dto.signatureUrl,
    isOfflineSynced: false,
    createdAt: new Date(),
  };
}

export function getPreventativeMaintenances(
  pm: PreventativeMaintenanceRecord[],
  tenantId: string,
): PreventativeMaintenanceRecord[] {
  return tenantOf(pm, tenantId).sort((a, b) => a.nextRunDate.getTime() - b.nextRunDate.getTime());
}

export function createPreventativeMaintenance(
  pm: PreventativeMaintenanceRecord[],
  tenantId: string,
  dto: { customerName: string; description: string; recurrenceCron: string; nextRunDate: string },
): PreventativeMaintenanceRecord {
  return {
    id: `pm_${pm.length + 1}`,
    tenantId,
    customerName: dto.customerName,
    description: dto.description,
    recurrenceCron: dto.recurrenceCron,
    nextRunDate: new Date(dto.nextRunDate),
    status: "ACTIVE",
  };
}
