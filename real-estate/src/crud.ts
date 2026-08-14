/**
 * Real Estate CRUD logic ported from
 * `unierp-app-realestate/src/real-estate.service.ts` (E26) as pure functions
 * over in-memory records. Money values are kept as numbers at the domain
 * boundary and declared `decimal` in the schema.
 */

export interface PropertyRecord {
  id: string;
  tenantId: string;
  name: string;
  type: string;
  portfolio: string;
  address: unknown;
  parentId?: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaseRecord {
  id: string;
  tenantId: string;
  propertyId: string;
  tenantName: string;
  startDate: Date;
  endDate: Date;
  rentAmount: number;
  securityDeposit: number;
  billingFrequency: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  property?: PropertyRecord | null;
}

export interface PropertyMaintenanceRecord {
  id: string;
  tenantId: string;
  propertyId: string;
  description: string;
  status: string;
  vendorId?: string | null;
  cost: number;
  createdAt: Date;
  updatedAt: Date;
  property?: PropertyRecord | null;
}

export interface AgentCommissionRecord {
  id: string;
  tenantId: string;
  agentId: string;
  amount: number;
  splitRatio: number;
  generalLedgerRef: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

function tenantOf<T extends { tenantId: string }>(rows: T[], tenantId: string): T[] {
  return rows.filter((r) => r.tenantId === tenantId);
}

export function getProperties(
  properties: PropertyRecord[],
  tenantId: string,
): PropertyRecord[] {
  return tenantOf(properties, tenantId).sort((a, b) => a.name.localeCompare(b.name));
}

export function createProperty(
  properties: PropertyRecord[],
  tenantId: string,
  dto: { name: string; type: string; portfolio: string; address: string; parentId?: string },
): PropertyRecord {
  const now = new Date();
  return {
    id: `prop_${properties.length + 1}`,
    tenantId,
    name: dto.name,
    type: dto.type,
    portfolio: dto.portfolio,
    address: JSON.parse(dto.address),
    parentId: dto.parentId,
    status: "AVAILABLE",
    createdAt: now,
    updatedAt: now,
  };
}

export function getLeases(leases: LeaseRecord[], tenantId: string): LeaseRecord[] {
  return tenantOf(leases, tenantId).sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
}

export function createLease(
  leases: LeaseRecord[],
  tenantId: string,
  dto: {
    propertyId: string;
    tenantName: string;
    startDate: string;
    endDate: string;
    rentAmount: number;
    securityDeposit: number;
    billingFrequency: string;
  },
): LeaseRecord {
  const now = new Date();
  return {
    id: `ls_${leases.length + 1}`,
    tenantId,
    propertyId: dto.propertyId,
    tenantName: dto.tenantName,
    startDate: new Date(dto.startDate),
    endDate: new Date(dto.endDate),
    rentAmount: dto.rentAmount,
    securityDeposit: dto.securityDeposit,
    billingFrequency: dto.billingFrequency,
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  };
}

export function getPropertyMaintenances(
  pm: PropertyMaintenanceRecord[],
  tenantId: string,
): PropertyMaintenanceRecord[] {
  return tenantOf(pm, tenantId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function createPropertyMaintenance(
  pm: PropertyMaintenanceRecord[],
  tenantId: string,
  dto: { propertyId: string; description: string; vendorId?: string; cost?: number },
): PropertyMaintenanceRecord {
  const now = new Date();
  return {
    id: `pm_${pm.length + 1}`,
    tenantId,
    propertyId: dto.propertyId,
    description: dto.description,
    vendorId: dto.vendorId,
    cost: dto.cost ?? 0,
    status: "OPEN",
    createdAt: now,
    updatedAt: now,
  };
}

export function getAgentCommissions(
  commissions: AgentCommissionRecord[],
  tenantId: string,
): AgentCommissionRecord[] {
  return tenantOf(commissions, tenantId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function createAgentCommission(
  commissions: AgentCommissionRecord[],
  tenantId: string,
  dto: { agentId: string; amount: number; splitRatio: number; generalLedgerRef: string },
): AgentCommissionRecord {
  const now = new Date();
  return {
    id: `ac_${commissions.length + 1}`,
    tenantId,
    agentId: dto.agentId,
    amount: dto.amount,
    splitRatio: dto.splitRatio,
    generalLedgerRef: dto.generalLedgerRef,
    status: "PENDING",
    createdAt: now,
    updatedAt: now,
  };
}
