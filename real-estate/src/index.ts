import {
  ExtensionContext,
  ExtensionFactory,
  Extension,
} from "@kannan19302/extension-api";
import { manifest } from "./manifest";
import { realEstateRoutes } from "./routes";
import { realEstateSchema } from "./schema";

/**
 * Real Estate Extension (L6).
 *
 * Ported forward from the archived `unierp-app-realestate` satellite repository
 * (E26): properties, leases, property maintenance and agent commissions with
 * ASC-842 lease accounting now run from THIS package against the public
 * extension API. The declared schema provisions the tenant tables
 * (`ext_real_estate_<entity>` with tenant_id + RLS); customRoutes expose every
 * archived endpoint; lifecycle hooks log per-tenant install/enable/disable.
 */

export { manifest };
export { realEstateSchema };
export { realEstateRoutes };

const factory: ExtensionFactory = (_context: ExtensionContext): Extension => {
  return {
    onInstall: async (ctx: ExtensionContext) => {
      ctx.api.log(
        `Real Estate extension installed for tenant ${ctx.tenantId}`,
      );
    },
    onEnable: async (ctx: ExtensionContext) => {
      ctx.api.log(
        `Real Estate extension enabled for tenant ${ctx.tenantId}`,
      );
      ctx.api.log(
        `Declared ${realEstateSchema.entities.length} schema entities for tenant ${ctx.tenantId}`,
      );
    },
    onDisable: async (ctx: ExtensionContext) => {
      ctx.api.log(
        `Real Estate extension disabled for tenant ${ctx.tenantId}`,
      );
    },
    onUninstall: async (ctx: ExtensionContext) => {
      ctx.api.log(
        `Real Estate extension uninstalled for tenant ${ctx.tenantId}`,
      );
    },
    customRoutes: realEstateRoutes,
  };
};

export default factory;
