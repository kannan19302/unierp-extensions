import type { ExtensionManifestV1 } from "@kannan19302/extension-api";
import { educationSchema } from "./schema";

/**
 * Manifest for the Education extension — ported from the archived
 * `unierp-app-education` (E26). Declared schema provisions
 * `ext_education_<entity>` tables with tenant_id + RLS.
 */
export const manifest: ExtensionManifestV1 = {
  id: "education",
  name: "Education Management",
  version: "1.0.0",
  description:
    "Student, course, timetable, fee and library management with enrolment, grading (letter bands), transcripts, attendance and fee invoicing.",
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
  schema: educationSchema,
};
