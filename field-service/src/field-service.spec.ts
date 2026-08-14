import { describe, expect, it } from "vitest";
import { ExtensionContext, Extension } from "@kannan19302/extension-api";
import factory, { manifest, fieldServiceRoutes } from "./index";
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
} from "./crud";
import type {
  PreventativeMaintenanceRecord,
  ServiceDispatchRecord,
  ServiceTicketRecord,
} from "./dispatch";

function ctx(tenantId: string): ExtensionContext {
  return { tenantId, api: { log: () => {} } };
}

function makeTicket(
  tenantId: string,
  overrides: Partial<ServiceTicketRecord> = {},
): ServiceTicketRecord {
  const base: ServiceTicketRecord = {
    id: `tkt_${Math.random().toString(36).slice(2)}`,
    tenantId,
    title: "Printer down",
    customerName: "Acme",
    description: "No power",
    priority: "HIGH",
    slaDeadline: new Date("2099-01-01"),
    status: "OPEN",
  };
  return { ...base, ...overrides };
}

function makeDispatch(tenantId: string): ServiceDispatchRecord {
  return {
    id: "disp_1",
    tenantId,
    ticketId: "tkt_1",
    technicianId: "tech_1",
    scheduledTime: new Date("2099-01-01T10:00:00"),
    status: "ASSIGNED",
  };
}

describe("field service manifest", () => {
  it("declares a valid manifest", () => {
    expect(manifest.id).toBe("field_service");
    expect(manifest.schema?.entities.length).toBe(4);
  });

  it("factory returns extension with routes", () => {
    const ext: Extension = factory(ctx("t1"));
    expect(typeof ext.onEnable).toBe("function");
    expect(fieldServiceRoutes["/dispatch/board"]).toBeTypeOf("function");
    expect(fieldServiceRoutes["/tickets"]).toBeTypeOf("function");
  });
});

describe("dispatch board", () => {
  it("lists dispatches for the day and open unassigned tickets", () => {
    const tickets = [
      makeTicket("t1", { id: "a" }),
      makeTicket("t1", { id: "b" }),
    ];
    const dispatches = [{ ...makeDispatch("t1"), ticketId: "a" }];
    const board = getDispatchBoard(tickets, dispatches, "t1", "2099-01-01");
    expect(board.dispatched).toBe(1);
    expect(board.unassigned).toBe(1);
    expect(board.totalTickets).toBe(2);
  });
});

describe("assignment and status", () => {
  it("assigns a technician and flags the ticket", () => {
    const tickets = [makeTicket("t1", { id: "t1" })];
    const dispatch = assignTechnician(tickets, [], "t1", {
      ticketId: "t1",
      technicianId: "tech_9",
      scheduledTime: "2099-02-01",
    });
    expect(dispatch.status).toBe("ASSIGNED");
    expect(tickets[0].status).toBe("ASSIGNED");
  });

  it("throws on unknown ticket", () => {
    expect(() =>
      assignTechnician([], [], "t1", {
        ticketId: "nope",
        technicianId: "t",
        scheduledTime: "d",
      }),
    ).toThrow();
  });

  it("completing a dispatch resolves its ticket", () => {
    const ticket = makeTicket("t1", { id: "t1" });
    const dispatch: ServiceDispatchRecord = { ...makeDispatch("t1"), ticket };
    const done = updateDispatchStatus([dispatch], "t1", "disp_1", "COMPLETED");
    expect(done.status).toBe("COMPLETED");
    expect(ticket.status).toBe("RESOLVED");
  });
});

describe("SLA", () => {
  it("flags breached tickets past deadline", () => {
    const overdue = makeTicket("t1", { id: "x", slaDeadline: new Date("2000-01-01") });
    const future = makeTicket("t1", { id: "y", slaDeadline: new Date("2099-01-01") });
    const sla = getSlaStatus([overdue, future], "t1");
    expect(sla.breached).toBe(1);
    expect(sla.totalOpen).toBe(2);
  });
});

describe("preventative maintenance", () => {
  it("returns only due non-completed PMs", () => {
    const pm: PreventativeMaintenanceRecord = {
      id: "pm1",
      tenantId: "t1",
      customerName: "Acme",
      description: "HVAC",
      recurrenceCron: "0 0 1 * *",
      nextRunDate: new Date(),
      status: "ACTIVE",
    };
    const other: PreventativeMaintenanceRecord = {
      ...pm,
      id: "pm2",
      status: "COMPLETED",
    };
    const due = getUpcomingPM([pm, other], "t1", 30);
    expect(due).toHaveLength(1);
    expect(due[0].id).toBe("pm1");
  });
});

describe("CRUD", () => {
  it("creates tickets and dispatches", () => {
    const ticket = createTicket([], "t1", {
      title: "T",
      customerName: "C",
      description: "D",
      slaDeadline: "2099-01-01",
    });
    expect(ticket.status).toBe("OPEN");
    const dispatch = createDispatch([], "t1", {
      ticketId: ticket.id,
      technicianId: "tech",
      scheduledTime: "2099-01-01",
      routeDetails: '{"zone":"north"}',
    });
    expect(dispatch.routeDetails).toEqual({ zone: "north" });
  });

  it("creates offline-flagged checklists", () => {
    const cl = createChecklist([], "t1", {
      dispatchId: "d1",
      items: '[{"task":"check power"}]',
    });
    expect(cl.isOfflineSynced).toBe(false);
    expect(cl.items).toEqual([{ task: "check power" }]);
  });

  it("creates preventative maintenance records", () => {
    const pm = createPreventativeMaintenance([], "t1", {
      customerName: "Acme",
      description: "Generator",
      recurrenceCron: "0 0 * * 0",
      nextRunDate: "2099-01-01",
    });
    expect(pm.status).toBe("ACTIVE");
  });
});
