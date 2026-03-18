import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    root: ".",
    include: [
      "test/unit/**/*.test.js",
      "test/integration/**/*.test.js",
      "test/validation/tier1/**/*.test.js",
      "test/validation/atdd/**/*.test.js",
    ],
    coverage: {
      provider: "v8",
      include: ["bin/**/*.js"],
      exclude: ["test/**", "node_modules/**"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
      reporter: ["text", "lcov", "json-summary"],
    },
    testTimeout: 30000,
  },
});
