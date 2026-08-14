import {
  ExtensionContext,
  ExtensionFactory,
  Extension,
} from "@kannan19302/extension-api";
import { manifest } from "./manifest";
import { educationRoutes } from "./routes";
import { educationSchema } from "./schema";

/**
 * Education Management Extension (L6).
 *
 * Ported forward from the archived `unierp-app-education` satellite repository
 * (E26): student/course/timetable/fee/library CRUD, enrolment, grading,
 * transcripts, attendance and fee invoices now run from THIS package against
 * the public extension API. The declared schema provisions the tenant tables
 * (`ext_education_<entity>` with tenant_id + RLS); customRoutes expose every
 * archived endpoint; lifecycle hooks log per-tenant install/enable/disable.
 */

export { manifest };
export { educationSchema };
export { educationRoutes };

const factory: ExtensionFactory = (_context: ExtensionContext): Extension => {
  return {
    onInstall: async (ctx: ExtensionContext) => {
      ctx.api.log(
        `Education Management extension installed for tenant ${ctx.tenantId}`,
      );
    },
    onEnable: async (ctx: ExtensionContext) => {
      ctx.api.log(
        `Education Management extension enabled for tenant ${ctx.tenantId}`,
      );
      ctx.api.log(
        `Declared ${educationSchema.entities.length} schema entities for tenant ${ctx.tenantId}`,
      );
    },
    onDisable: async (ctx: ExtensionContext) => {
      ctx.api.log(
        `Education Management extension disabled for tenant ${ctx.tenantId}`,
      );
    },
    onUninstall: async (ctx: ExtensionContext) => {
      ctx.api.log(
        `Education Management extension uninstalled for tenant ${ctx.tenantId}`,
      );
    },
    customRoutes: educationRoutes,
  };
};

export default factory;
