import type { ExtensionManifestV1 } from "@kannan19302/extension-api";
import { healthcareSchema } from "./schema";

/**
 * Manifest for the Healthcare extension — ported from the archived
 * `unierp-app-healthcare` install-time manifest (E26). The declared schema
 * provisions `ext_healthcare_<entity>` tables with tenant_id + RLS. Scopes are
 * limited to what the extension genuinely needs: read/write its own records
 * and log. No wildcard, no egress, no jobs.
 */
export const manifest: ExtensionManifestV1 = {
  id: "healthcare",
  name: "Healthcare Management",
  version: "1.0.0",
  description:
    "Eligibility, claim scrubbing, drug-interaction checks, CDS, quality measures, FHIR read projections and clinical encounter/prescription workflows.",
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
  schema: healthcareSchema,
};
