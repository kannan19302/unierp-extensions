import type { ExtensionManifestV1 } from "@kannan19302/extension-api";
import { fieldServiceSchema } from "./schema";

/**
 * Manifest for the Field Service extension — ported from the archived
 * `unierp-app-fieldservice` (E26). Declared schema provisions
 * `ext_field_service_<entity>` tables with tenant_id + RLS.
 */
export const manifest: ExtensionManifestV1 = {
  id: "field_service",
  name: "Field Service Management",
  version: "1.0.0",
  description:
    "Service tickets, dispatch board, technician assignment, SLA tracking, checklists and preventative maintenance.",
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
  schema: fieldServiceSchema,
};
