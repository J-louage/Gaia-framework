import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * E3-S8: Structural tests verifying that test helpers do NOT use
 * `new Function()` eval and instead use `require()` with DI or vi.mock().
 *
 * These tests enforce AC1–AC3 at the source level.
 */

const HELPERS_TEST_PATH = join(import.meta.dirname, "helpers.test.js");
const LOAD_HELPERS_PATH = join(import.meta.dirname, "../../fixtures/load-helpers.js");

describe("E3-S8: No eval in test helpers", () => {
  describe("AC1: helpers.test.js must not use new Function()", () => {
    it("should not contain 'new Function' anywhere in helpers.test.js", () => {
      const source = readFileSync(HELPERS_TEST_PATH, "utf8");
      const lines = source.split("\n");
      const evalLines = lines.filter((line) => {
        const trimmed = line.trim();
        // Skip comments
        if (trimmed.startsWith("//")) return false;
        if (trimmed.startsWith("*")) return false;
        if (trimmed.startsWith("/*")) return false;
        return /\bnew\s+Function\b/.test(trimmed);
      });
      expect(evalLines, "helpers.test.js still contains new Function()").toEqual([]);
    });
  });

  describe("AC2: load-helpers.js must not use new Function()", () => {
    it("should not contain 'new Function' anywhere in load-helpers.js", () => {
      const source = readFileSync(LOAD_HELPERS_PATH, "utf8");
      const lines = source.split("\n");
      const evalLines = lines.filter((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("//")) return false;
        if (trimmed.startsWith("*")) return false;
        if (trimmed.startsWith("/*")) return false;
        return /\bnew\s+Function\b/.test(trimmed);
      });
      expect(evalLines, "load-helpers.js still contains new Function()").toEqual([]);
    });
  });

  describe("AC3: Both files use require() or import for module loading", () => {
    it("helpers.test.js should use require() or import to load the CLI module", () => {
      const source = readFileSync(HELPERS_TEST_PATH, "utf8");
      const usesRequireOrImport =
        /require\(.*gaia-framework/.test(source) || /import.*gaia-framework/.test(source);
      expect(usesRequireOrImport, "helpers.test.js should require/import gaia-framework.js").toBe(
        true
      );
    });

    it("load-helpers.js should use require() to load the CLI module", () => {
      const source = readFileSync(LOAD_HELPERS_PATH, "utf8");
      // The module uses require(modulePath) where modulePath is resolved from binDir + gaia-framework.js
      const usesRequire =
        /require\(modulePath\)/.test(source) || /require\(.*gaia-framework/.test(source);
      expect(usesRequire, "load-helpers.js should use require() to load the module").toBe(true);
    });
  });
});
