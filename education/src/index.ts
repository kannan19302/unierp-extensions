import {
  ExtensionContext,
  ExtensionFactory,
  Extension,
} from "../../../packages/extension-api/src/index";

// Education Management Extension
// Migrated from unierp-app-education satellite repository
// Depends only on @unerp/extension-api — no privileged monolith access

const factory: ExtensionFactory = (_context: ExtensionContext): Extension => {
  return {
    onInstall: async (ctx: ExtensionContext) => {
      ctx.api.log(
        "Education Management extension installed for tenant " + ctx.tenantId,
      );
    },
    onEnable: async (ctx: ExtensionContext) => {
      ctx.api.log(
        "Education Management extension enabled for tenant " + ctx.tenantId,
      );
    },
    onDisable: async (ctx: ExtensionContext) => {
      ctx.api.log(
        "Education Management extension disabled for tenant " + ctx.tenantId,
      );
    },
    onUninstall: async (ctx: ExtensionContext) => {
      ctx.api.log(
        "Education Management extension uninstalled for tenant " + ctx.tenantId,
      );
    },
  };
};

export default factory;
