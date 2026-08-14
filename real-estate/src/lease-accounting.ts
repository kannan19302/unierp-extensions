import { LeaseRecord, PropertyRecord } from "./crud";

/**
 * Lease accounting logic ported from
 * `unierp-app-realestate/src/lease-accounting.service.ts` (E26): ASC-842-style
 * lease schedule (present value, interest, liability/ROU amortization), lease
 * classification, portfolio summary, rent roll and expiring-lease look-ahead.
 * All money arithmetic rounds to cents exactly as the archived service did.
 */

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

const CENTS = 100;
const round2 = (n: number): number => Math.round(n * CENTS) / CENTS;

export function calculateLeaseSchedule(
  leases: LeaseRecord[],
  tenantId: string,
  leaseId: string,
  discountRate = 0.05,
) {
  const lease = leases.find((l) => l.id === leaseId && l.tenantId === tenantId);
  if (!lease) throw new NotFoundError("Lease not found");

  const startDate = new Date(lease.startDate);
  const endDate = new Date(lease.endDate);
  const monthlyRent = Number(lease.rentAmount);
  const totalMonths = Math.max(
    1,
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth()) +
      1,
  );

  const monthlyRate = discountRate / 12;
  let pvTotal = 0;
  for (let m = 1; m <= totalMonths; m++) {
    pvTotal += monthlyRent / Math.pow(1 + monthlyRate, m);
  }

  let liabilityBalance = pvTotal;
  let rouAssetBalance = pvTotal;
  const monthlyAmort = pvTotal / totalMonths;
  const schedule: Array<{
    month: number;
    date: string;
    payment: number;
    interest: number;
    amortization: number;
    liabilityBalance: number;
    rouAssetBalance: number;
  }> = [];

  for (let m = 1; m <= totalMonths; m++) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + m - 1);
    const interest = round2(liabilityBalance * monthlyRate);
    liabilityBalance = Math.max(0, liabilityBalance - (monthlyRent - interest));
    rouAssetBalance = Math.max(0, rouAssetBalance - monthlyAmort);

    schedule.push({
      month: m,
      date: d.toISOString().slice(0, 10),
      payment: monthlyRent,
      interest,
      amortization: round2(monthlyAmort),
      liabilityBalance: round2(liabilityBalance),
      rouAssetBalance: round2(rouAssetBalance),
    });
  }

  return {
    leaseId,
    propertyName: lease.property?.name || "Unknown",
    classification: totalMonths > 12 ? "FINANCE_LEASE" : "OPERATING_LEASE",
    totalMonths,
    monthlyPayment: monthlyRent,
    discountRate,
    initialRouAsset: round2(pvTotal),
    initialLeaseLiability: round2(pvTotal),
    totalPayments: round2(monthlyRent * totalMonths),
    schedule,
  };
}

export function getPortfolioSummary(properties: PropertyRecord[], tenantId: string) {
  const scoped = properties.filter((p) => p.tenantId === tenantId);

  let totalRentIncome = 0;
  let vacantUnits = 0;
  let occupiedUnits = 0;

  for (const prop of scoped) {
    const activeLeases = ((prop as { leases?: LeaseRecord[] }).leases ?? []).filter(
      (l) => new Date(l.startDate) <= new Date() && new Date(l.endDate) >= new Date(),
    );
    if (activeLeases.length > 0) {
      occupiedUnits++;
      totalRentIncome += activeLeases.reduce((s, l) => s + Number(l.rentAmount), 0);
    } else {
      vacantUnits++;
    }
  }

  return {
    totalProperties: scoped.length,
    occupiedUnits,
    vacantUnits,
    occupancyRate:
      scoped.length > 0 ? round2((occupiedUnits / scoped.length) * 1000) / 10 : 0,
    monthlyRentIncome: round2(totalRentIncome),
    annualRentIncome: round2(totalRentIncome * 12),
  };
}

export function getRentRoll(leases: LeaseRecord[], tenantId: string) {
  const now = new Date();
  const active = leases.filter(
    (l) =>
      l.tenantId === tenantId &&
      new Date(l.startDate) <= now &&
      new Date(l.endDate) >= now,
  );

  return active.map((l) => ({
    leaseId: l.id,
    propertyName: l.property?.name || "Unknown",
    tenantName: l.tenantName,
    rentAmount: Number(l.rentAmount),
    leaseStart: l.startDate,
    leaseEnd: l.endDate,
    daysRemaining: Math.max(
      0,
      Math.ceil((new Date(l.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    ),
    status: l.status,
  }));
}

export function getExpiringLeases(leases: LeaseRecord[], tenantId: string, withinDays = 90) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + withinDays);

  const scoped = leases
    .filter(
      (l) =>
        l.tenantId === tenantId &&
        new Date(l.endDate) <= cutoff &&
        new Date(l.endDate) >= new Date(),
    )
    .sort((a, b) => a.endDate.getTime() - b.endDate.getTime());

  return scoped.map((l) => ({
    leaseId: l.id,
    propertyName: l.property?.name,
    rentAmount: Number(l.rentAmount),
    endDate: l.endDate,
    daysRemaining: Math.ceil((new Date(l.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  }));
}
