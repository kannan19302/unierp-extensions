import {
  ExtensionContext,
  ExtensionFactory,
  Extension,
} from "@kannan19302/extension-api";

// Field Service Management Extension
// Migrated from unierp-app-field-service satellite repository
// Depends only on @kannan19302/extension-api — no privileged monolith access

const factory: ExtensionFactory = (_context: ExtensionContext): Extension => {
  return {
    onInstall: async (ctx: ExtensionContext) => {
      ctx.api.log(
        "Field Service Management extension installed for tenant " +
          ctx.tenantId,
      );
    },
    onEnable: async (ctx: ExtensionContext) => {
      ctx.api.log(
        "Field Service Management extension enabled for tenant " + ctx.tenantId,
      );
    },
    onDisable: async (ctx: ExtensionContext) => {
      ctx.api.log(
        "Field Service Management extension disabled for tenant " +
          ctx.tenantId,
      );
    },
    onUninstall: async (ctx: ExtensionContext) => {
      ctx.api.log(
        "Field Service Management extension uninstalled for tenant " +
          ctx.tenantId,
      );
    },
  };
};

export default factory;
