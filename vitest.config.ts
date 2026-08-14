import { defineConfig } from "vitest/config";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)));

export default defineConfig({
  test: {
    root: rootDir,
    include: [
      "healthcare/src/**/*.spec.ts",
      "education/src/**/*.spec.ts",
      "field-service/src/**/*.spec.ts",
      "real-estate/src/**/*.spec.ts",
    ],
    environment: "node",
  },
});
