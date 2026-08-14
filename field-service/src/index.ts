import {
  ExtensionContext,
  ExtensionFactory,
  Extension,
} from "@kannan19302/extension-api";
import { manifest } from "./manifest";
import { fieldServiceRoutes } from "./routes";
import { fieldServiceSchema } from "./schema";

/**
 * Field Service Extension (L6).
 *
 * Ported forward from the archived `unierp-app-fieldservice` satellite repository
 * (E26): service tickets, dispatch board, technician assignment, SLA tracking,
 * checklists and preventative maintenance now run from THIS package against the
 * public extension API. The declared schema provisions the tenant tables
 * (`ext_field_service_<entity>` with tenant_id + RLS); customRoutes expose every
 * archived endpoint; lifecycle hooks log per-tenant install/enable/disable.
 */

export { manifest };
export { fieldServiceSchema };
export { fieldServiceRoutes };

const factory: ExtensionFactory = (_context: ExtensionContext): Extension => {
  return {
    onInstall: async (ctx: ExtensionContext) => {
      ctx.api.log(
        `Field Service extension installed for tenant ${ctx.tenantId}`,
      );
    },
    onEnable: async (ctx: ExtensionContext) => {
      ctx.api.log(
        `Field Service extension enabled for tenant ${ctx.tenantId}`,
      );
      ctx.api.log(
        `Declared ${fieldServiceSchema.entities.length} schema entities for tenant ${ctx.tenantId}`,
      );
    },
    onDisable: async (ctx: ExtensionContext) => {
      ctx.api.log(
        `Field Service extension disabled for tenant ${ctx.tenantId}`,
      );
    },
    onUninstall: async (ctx: ExtensionContext) => {
      ctx.api.log(
        `Field Service extension uninstalled for tenant ${ctx.tenantId}`,
      );
    },
    customRoutes: fieldServiceRoutes,
  };
};

export default factory;
