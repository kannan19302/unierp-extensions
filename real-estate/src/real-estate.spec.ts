import { describe, expect, it } from "vitest";
import { ExtensionContext, Extension } from "@kannan19302/extension-api";
import factory, { manifest, realEstateRoutes } from "./index";
import {
  calculateLeaseSchedule,
  getExpiringLeases,
  getPortfolioSummary,
  getRentRoll,
} from "./lease-accounting";
import {
  createAgentCommission,
  createLease,
  createProperty,
  createPropertyMaintenance,
} from "./crud";
import type { LeaseRecord, PropertyRecord } from "./crud";

function ctx(tenantId: string): ExtensionContext {
  return { tenantId, api: { log: () => {} } };
}

function makeProperty(tenantId: string, name = "HQ"): PropertyRecord {
  const now = new Date();
  return {
    id: `prop_${name}`,
    tenantId,
    name,
    type: "COMMERCIAL",
    portfolio: "Core",
    address: { street: "1 Main" },
    status: "AVAILABLE",
    createdAt: now,
    updatedAt: now,
    leases: [],
  } as PropertyRecord;
}

function makeLease(tenantId: string, overrides: Partial<LeaseRecord> = {}): LeaseRecord {
  const now = new Date();
  const base: LeaseRecord = {
    id: "ls_1",
    tenantId,
    propertyId: "prop_HQ",
    tenantName: "Acme",
    startDate: new Date("2026-01-01"),
    endDate: new Date("2028-01-01"),
    rentAmount: 5000,
    securityDeposit: 10000,
    billingFrequency: "MONTHLY",
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  };
  return { ...base, ...overrides };
}

describe("real estate manifest", () => {
  it("declares a valid manifest", () => {
    expect(manifest.id).toBe("real_estate");
    expect(manifest.schema?.entities.length).toBe(4);
  });

  it("factory returns extension with routes", () => {
    const ext: Extension = factory(ctx("t1"));
    expect(typeof ext.onDisable).toBe("function");
    expect(realEstateRoutes["/leasing/schedule/:leaseId"]).toBeTypeOf("function");
    expect(realEstateRoutes["/properties"]).toBeTypeOf("function");
  });
});

describe("lease accounting", () => {
  it("classifies a 2-year lease as finance and amortizes liability", () => {
    const lease = makeLease("t1");
    const schedule = calculateLeaseSchedule([lease], "t1", "ls_1", 0.05);
    expect(schedule.classification).toBe("FINANCE_LEASE");
    expect(schedule.totalMonths).toBe(25);
    expect(schedule.monthlyPayment).toBe(5000);
    expect(schedule.schedule).toHaveLength(25);
    expect(schedule.schedule[0].interest).toBeGreaterThan(0);
    expect(schedule.schedule[24].liabilityBalance).toBe(0);
  });

  it("classifies a short lease as operating", () => {
    const lease = makeLease("t1", { endDate: new Date("2026-06-01") });
    const schedule = calculateLeaseSchedule([lease], "t1", "ls_1", 0.05);
    expect(schedule.classification).toBe("OPERATING_LEASE");
    expect(schedule.totalMonths).toBe(6);
  });

  it("throws when lease is not found", () => {
    expect(() => calculateLeaseSchedule([], "t1", "nope")).toThrow();
  });
});

describe("portfolio summary", () => {
  it("computes occupancy and rent income", () => {
    const occupied = makeProperty("t1", "A");
    const vacant = makeProperty("t1", "B");
    const lease = makeLease("t1", {
      id: "ls_a",
      propertyId: "prop_A",
      startDate: new Date("2000-01-01"),
      endDate: new Date("2999-01-01"),
    });
    occupied.leases = [lease];

    const summary = getPortfolioSummary([occupied, vacant], "t1");
    expect(summary.totalProperties).toBe(2);
    expect(summary.occupiedUnits).toBe(1);
    expect(summary.vacantUnits).toBe(1);
    expect(summary.occupancyRate).toBe(50);
    expect(summary.monthlyRentIncome).toBe(5000);
    expect(summary.annualRentIncome).toBe(60000);
  });
});

describe("rent roll and expiring leases", () => {
  it("includes only current active leases in the rent roll", () => {
    const active = makeLease("t1", {
      id: "ls_active",
      startDate: new Date("2000-01-01"),
      endDate: new Date("2999-01-01"),
    });
    const expired = makeLease("t1", {
      id: "ls_expired",
      startDate: new Date("2000-01-01"),
      endDate: new Date("2001-01-01"),
    });
    const roll = getRentRoll([active, expired], "t1");
    expect(roll).toHaveLength(1);
    expect(roll[0].leaseId).toBe("ls_active");
    expect(roll[0].rentAmount).toBe(5000);
  });

  it("flags leases expiring within the window", () => {
    const expiring = makeLease("t1", {
      id: "ls_x",
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    const far = makeLease("t1", { id: "ls_y", endDate: new Date("2099-01-01") });
    const list = getExpiringLeases([expiring, far], "t1", 90);
    expect(list).toHaveLength(1);
    expect(list[0].leaseId).toBe("ls_x");
  });
});

describe("CRUD", () => {
  it("creates properties, leases, maintenance and commissions", () => {
    const prop = createProperty([], "t1", {
      name: "Warehouse",
      type: "COMMERCIAL",
      portfolio: "Growth",
      address: '{"line":"9 Dock"}',
    });
    expect(prop.status).toBe("AVAILABLE");
    expect(prop.address).toEqual({ line: "9 Dock" });

    const lease = createLease([], "t1", {
      propertyId: prop.id,
      tenantName: "Acme",
      startDate: "2026-01-01",
      endDate: "2028-01-01",
      rentAmount: 5000,
      securityDeposit: 10000,
      billingFrequency: "MONTHLY",
    });
    expect(lease.status).toBe("ACTIVE");

    const pm = createPropertyMaintenance([], "t1", {
      propertyId: prop.id,
      description: "Roof",
      cost: 1500,
    });
    expect(pm.status).toBe("OPEN");
    expect(pm.cost).toBe(1500);

    const commission = createAgentCommission([], "t1", {
      agentId: "ag_1",
      amount: 500,
      splitRatio: 0.5,
      generalLedgerRef: "GL-1",
    });
    expect(commission.status).toBe("PENDING");
  });
});
