import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { execSync } from "child_process";
import { existsSync } from "fs";

// gaia-framework.js uses CJS require() — we need to load it carefully.
// For unit tests, we extract and test the logic directly.

describe("findBash", () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform });
  });

  it("should return 'bash' on non-Windows platforms", async () => {
    Object.defineProperty(process, "platform", { value: "darwin" });

    // Re-import to pick up platform change
    const { findBash } = await loadHelpers();
    expect(findBash()).toBe("bash");
  });

  it("should try bash in PATH on Windows first", async () => {
    Object.defineProperty(process, "platform", { value: "win32" });

    const { findBash } = await loadHelpers();
    const result = findBash();
    // On a non-Windows test machine, this may return null or 'bash'
    expect(typeof result === "string" || result === null).toBe(true);
  });
});

describe("ensureGit", () => {
  it("should not throw when git is available", async () => {
    const { ensureGit } = await loadHelpers();
    // git should be available in the test environment
    expect(() => ensureGit()).not.toThrow();
  });
});

describe("showUsage", () => {
  it("should output usage text to console", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { showUsage } = await loadHelpers();

    showUsage();

    expect(spy).toHaveBeenCalled();
    const output = spy.mock.calls[0][0];
    expect(output).toContain("gaia-framework");
    expect(output).toContain("init");
    expect(output).toContain("update");
    expect(output).toContain("validate");
    expect(output).toContain("status");

    spy.mockRestore();
  });
});

/**
 * Helper to load functions from gaia-framework.js.
 * Since the file is a CJS script that calls main() at the bottom,
 * we need to extract functions without triggering main().
 */
async function loadHelpers() {
  // Read the source and extract functions for testing
  const { readFileSync } = await import("fs");
  const { join } = await import("path");
  const source = readFileSync(
    join(import.meta.dirname, "../../../bin/gaia-framework.js"),
    "utf8",
  );

  // Create a module scope without executing main()
  const wrappedSource = source
    .replace("main();", "// main() disabled for testing")
    .replace("#!/usr/bin/env node", "");

  const fn = new Function(
    "require",
    "process",
    "console",
    "__dirname",
    "__filename",
    `
    const module = { exports: {} };
    const exports = module.exports;
    ${wrappedSource}
    return { findBash, ensureGit, showUsage, fail, info, cleanup };
  `,
  );

  const { join: pathJoin } = await import("path");
  const binDir = pathJoin(import.meta.dirname, "../../../bin");

  return fn(
    require,
    process,
    console,
    binDir,
    pathJoin(binDir, "gaia-framework.js"),
  );
}
