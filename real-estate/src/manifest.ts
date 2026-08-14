import type { ExtensionManifestV1 } from "@kannan19302/extension-api";
import { realEstateSchema } from "./schema";

/**
 * Manifest for the Real Estate extension — ported from the archived
 * `unierp-app-realestate` (E26). Declared schema provisions
 * `ext_real_estate_<entity>` tables with tenant_id + RLS; money fields decimal.
 */
export const manifest: ExtensionManifestV1 = {
  id: "real_estate",
  name: "Real Estate Management",
  version: "1.0.0",
  description:
    "Properties, leases, property maintenance and agent commissions with ASC-842 lease accounting (schedule, portfolio, rent roll, expiring leases).",
  publisher: "kannan19302",
  scopes: ["data:read", "data:write", "log:write"],
  entryPoint: "dist/index.js",
  budget: {
    memoryMb: 64,
    timeoutMs: 5000,
    cpuMsPerMinute: 60000,
    queriesPerInvocation: 500,
    httpCallsPerInvocation: 10,
  },
  egress: [],
  schema: realEstateSchema,
};
