import {
  ExtensionContext,
  ExtensionFactory,
  Extension,
} from "@unerp/extension-api";

const factory: ExtensionFactory = (context: ExtensionContext): Extension => {
  return {
    onInstall: async (ctx: ExtensionContext) => {
      ctx.api.log("Real Estate extension installed for tenant " + ctx.tenantId);
    },
    onEnable: async (ctx: ExtensionContext) => {
      ctx.api.log("Real Estate extension enabled for tenant " + ctx.tenantId);
    },
    customRoutes: {
      // Parameter types come from Extension['customRoutes']; annotating them
      // here only restates the `any` in that signature and trips the lint rule.
      "/properties": async (_req, res) => {
        context.api.log("Fetched properties");
        res.json({ properties: [] });
      },
    },
  };
};

export default factory;
