import {
  ExtensionContext,
  ExtensionFactory,
  Extension,
} from "@kannan19302/extension-api";
import { manifest } from "./manifest";
import { healthcareRoutes } from "./routes";
import { healthcareSchema } from "./schema";

/**
 * Healthcare Management Extension (L6).
 *
 * Ported forward from the archived `unierp-app-healthcare` satellite repository
 * (E26): eligibility, claim scrubbing, drug-interaction checks, CDS, quality
 * measures, FHIR read projections and the clinical encounter/prescription
 * workflows now run from THIS package against the public extension API, with
 * no dependency on the monolith and no reach-back into the archived repo.
 *
 * The factory is the extension's single exported surface. Lifecycle hooks log
 * install/enable/disable/uninstall per tenant; customRoutes expose every
 * archived controller endpoint; the declared schema provisions the tenant
 * tables (`ext_healthcare_<entity>` with tenant_id + RLS) that back the domain
 * logic. `manifest` is exported so installers can validate the declared model
 * without instantiating the extension.
 */

export { manifest };
export { healthcareSchema };
export { healthcareRoutes };

const factory: ExtensionFactory = (_context: ExtensionContext): Extension => {
  return {
    onInstall: async (ctx: ExtensionContext) => {
      ctx.api.log(
        `Healthcare Management extension installed for tenant ${ctx.tenantId}`,
      );
    },
    onEnable: async (ctx: ExtensionContext) => {
      ctx.api.log(
        `Healthcare Management extension enabled for tenant ${ctx.tenantId}`,
      );
      ctx.api.log(
        `Declared ${healthcareSchema.entities.length} schema entities for tenant ${ctx.tenantId}`,
      );
    },
    onDisable: async (ctx: ExtensionContext) => {
      ctx.api.log(
        `Healthcare Management extension disabled for tenant ${ctx.tenantId}`,
      );
    },
    onUninstall: async (ctx: ExtensionContext) => {
      ctx.api.log(
        `Healthcare Management extension uninstalled for tenant ${ctx.tenantId}`,
      );
    },
    customRoutes: healthcareRoutes,
  };
};

export default factory;
