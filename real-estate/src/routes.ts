import type {
  Extension,
  ExtensionRequest,
  ExtensionResponse,
} from "@kannan19302/extension-api";
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
  getAgentCommissions,
  getLeases,
  getProperties,
  getPropertyMaintenances,
} from "./crud";

/**
 * Route wiring for the Real Estate extension (E26). Every archived controller
 * endpoint from `unierp-app-realestate` maps to one handler here.
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

export const realEstateRoutes: NonNullable<Extension["customRoutes"]> = {
  // ── CRUD (real-estate.controller.ts) ──
  "/properties": async (req, res) => {
    const records = readRecords(req.body);
    const properties = (records.property ?? []) as never[];
    if (req.query?.__create === "1") {
      await handle(() => createProperty(properties, "", { ...(req.body as Record<string, string>) } as never), req, res);
      return;
    }
    await handle(() => getProperties(properties, ""), req, res);
  },

  "/leases": async (req, res) => {
    const records = readRecords(req.body);
    const leases = (records.lease ?? []) as never[];
    if (req.query?.__create === "1") {
      await handle(() => createLease(leases, "", { ...(req.body as Record<string, string>) } as never), req, res);
      return;
    }
    await handle(() => getLeases(leases, ""), req, res);
  },

  "/maintenances": async (req, res) => {
    const records = readRecords(req.body);
    const pm = (records.property_maintenance ?? []) as never[];
    if (req.query?.__create === "1") {
      await handle(() => createPropertyMaintenance(pm, "", { ...(req.body as Record<string, string>) } as never), req, res);
      return;
    }
    await handle(() => getPropertyMaintenances(pm, ""), req, res);
  },

  "/commissions": async (req, res) => {
    const records = readRecords(req.body);
    const commissions = (records.agent_commission ?? []) as never[];
    if (req.query?.__create === "1") {
      await handle(() => createAgentCommission(commissions, "", { ...(req.body as Record<string, string>) } as never), req, res);
      return;
    }
    await handle(() => getAgentCommissions(commissions, ""), req, res);
  },

  // ── Lease accounting (lease-accounting.controller.ts, /leasing prefix) ──
  "/leasing/schedule/:leaseId": async (req, res) => {
    const records = readRecords(req.body);
    const leases = (records.lease ?? []) as never[];
    const rate = req.query?.discountRate ? Number(req.query.discountRate) : 0.05;
    await handle(() => calculateLeaseSchedule(leases, "", req.params?.leaseId ?? "", rate), req, res);
  },

  "/leasing/portfolio": async (req, res) => {
    const records = readRecords(req.body);
    const properties = (records.property ?? []) as never[];
    await handle(() => getPortfolioSummary(properties, ""), req, res);
  },

  "/leasing/rent-roll": async (req, res) => {
    const records = readRecords(req.body);
    const leases = (records.lease ?? []) as never[];
    await handle(() => getRentRoll(leases, ""), req, res);
  },

  "/leasing/expiring": async (req, res) => {
    const records = readRecords(req.body);
    const leases = (records.lease ?? []) as never[];
    const days = req.query?.days ? Number(req.query.days) : 90;
    await handle(() => getExpiringLeases(leases, "", days), req, res);
  },
};
