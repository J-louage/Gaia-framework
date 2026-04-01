import { describe, it, expect, vi, afterEach } from "vitest";
import { createRequire } from "node:module";
import { join } from "path";

const require = createRequire(import.meta.url);

// Absolute path to the CJS source module
const SOURCE_PATH = join(import.meta.dirname, "../../../bin/gaia-framework.js");

/**
 * Helper to load functions from gaia-framework.js using require() with
 * cache-busting and dependency patching (E3-S8: migrated from new Function eval).
 *
 * Since gaia-framework.js checks `require.main === module` before calling main(),
 * requiring it from tests does NOT trigger main().
 *
 * Helper functions (findBash, ensureGit, etc.) capture module-level references
 * to execSync, existsSync, etc. at require-time. To inject mocks, we patch the
 * module singletons (child_process, fs) before require and restore after.
 *
 * process.exit and console are used dynamically, so we patch them around the
 * actual function call in the test, not around require.
 *
 * @param {Object} [mocks] - Optional mock overrides
 * @param {Function} [mocks.execSync] - Mock for child_process.execSync
 * @param {Function} [mocks.existsSync] - Mock for fs.existsSync
 * @param {Object} [mocks.env] - Mock process.env values (set before require for IS_WINDOWS env)
 * @param {Function} [mocks.processExit] - Mock for process.exit
 * @param {Object} [mocks.console] - Mock console object
 */
function loadHelpers(mocks = {}) {
  // Clear module cache so module-level constants (IS_WINDOWS etc.) are re-evaluated
  delete require.cache[SOURCE_PATH];

  // Patch module singletons before require
  const realChildProcess = require("child_process");
  const realFs = require("fs");
  const origExecSync = realChildProcess.execSync;
  const origExistsSync = realFs.existsSync;

  if (mocks.execSync) realChildProcess.execSync = mocks.execSync;
  if (mocks.existsSync) realFs.existsSync = mocks.existsSync;

  // Patch process.env before require (for IS_WINDOWS env var paths)
  const origEnv = process.env;
  if (mocks.env) {
    process.env = { ...origEnv, ...mocks.env };
  }

  // Patch process.exit and console before require — fail() and ensureGit()
  // use these dynamically but they're called at test-time, not require-time.
  // However, the module-level Node version guard (line 36-39) calls process.exit
  // during require if version check fails. So we patch before require to be safe.
  const origExit = process.exit;
  const origConsoleLog = console.log;
  const origConsoleError = console.error;

  if (mocks.processExit) process.exit = mocks.processExit;
  if (mocks.console) {
    console.log = mocks.console.log || origConsoleLog;
    console.error = mocks.console.error || origConsoleError;
  }

  let exported;
  try {
    exported = require(SOURCE_PATH);
  } finally {
    // Restore module singletons — the module has captured its own references
    // at require-time, so the captured values retain the mocked behavior.
    realChildProcess.execSync = origExecSync;
    realFs.existsSync = origExistsSync;
    process.env = origEnv;
    // NOTE: Do NOT restore process.exit and console here when mocks were provided.
    // Functions like fail(), ensureGit() use these DYNAMICALLY at call time
    // (not captured at require-time). Restoring them before the test calls
    // the function would undo the mocking. The test's afterEach handles cleanup.
    if (!mocks.processExit) process.exit = origExit;
    if (!mocks.console) {
      console.log = origConsoleLog;
      console.error = origConsoleError;
    }
  }

  return exported;
}

describe("findBash", () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform });
    vi.restoreAllMocks();
  });

  it("should return 'bash' on non-Windows platforms", () => {
    Object.defineProperty(process, "platform", { value: "darwin" });

    const { findBash } = loadHelpers();
    expect(findBash()).toBe("bash");
  });

  it("should return 'bash' on linux", () => {
    Object.defineProperty(process, "platform", { value: "linux" });

    const { findBash } = loadHelpers();
    expect(findBash()).toBe("bash");
  });

  it.skipIf(process.platform === "win32")(
    "should return 'bash' on Windows when bash is in PATH",
    () => {
      Object.defineProperty(process, "platform", { value: "win32" });

      const mockExecSync = vi.fn(); // succeeds (no throw)
      const { findBash } = loadHelpers({
        execSync: mockExecSync,
      });

      expect(findBash()).toBe("bash");
      expect(mockExecSync).toHaveBeenCalledWith("bash --version", { stdio: "ignore" });
    }
  );

  it("should find Git for Windows bash when PATH bash unavailable", () => {
    Object.defineProperty(process, "platform", { value: "win32" });

    const mockExecSync = vi.fn(() => {
      throw new Error("not found");
    });
    // join() uses the host OS separator, so on macOS the path uses /
    const expectedPath = join("C:\\Program Files", "Git", "bin", "bash.exe");
    const mockExistsSync = vi.fn((p) => p === expectedPath);

    const { findBash } = loadHelpers({
      execSync: mockExecSync,
      existsSync: mockExistsSync,
      env: {
        ProgramFiles: "C:\\Program Files",
        "ProgramFiles(x86)": "C:\\Program Files (x86)",
        LOCALAPPDATA: "C:\\Users\\test\\AppData\\Local",
      },
    });

    expect(findBash()).toBe(expectedPath);
  });

  it("should return null on Windows when no bash is available", () => {
    Object.defineProperty(process, "platform", { value: "win32" });

    const mockExecSync = vi.fn(() => {
      throw new Error("not found");
    });
    const mockExistsSync = vi.fn(() => false);

    const { findBash } = loadHelpers({
      execSync: mockExecSync,
      existsSync: mockExistsSync,
      env: {
        ProgramFiles: "C:\\Program Files",
        "ProgramFiles(x86)": "C:\\Program Files (x86)",
        LOCALAPPDATA: "C:\\Users\\test\\AppData\\Local",
      },
    });

    expect(findBash()).toBe(null);
  });

  it("should use default paths when Windows env vars are absent", () => {
    Object.defineProperty(process, "platform", { value: "win32" });

    const mockExecSync = vi.fn(() => {
      throw new Error("not found");
    });
    const calledPaths = [];
    const mockExistsSync = vi.fn((p) => {
      calledPaths.push(p);
      return false;
    });

    const { findBash } = loadHelpers({
      execSync: mockExecSync,
      existsSync: mockExistsSync,
      env: {},
    });

    findBash();

    // When env vars are empty, should fall back to default paths
    expect(calledPaths.some((p) => p.includes("C:\\Program Files"))).toBe(true);
  });
});

describe("ensureGit", () => {
  const savedExit = process.exit;
  const savedLog = console.log;
  const savedError = console.error;

  afterEach(() => {
    process.exit = savedExit;
    console.log = savedLog;
    console.error = savedError;
    vi.restoreAllMocks();
  });

  it("should not throw when git is available", () => {
    const { ensureGit } = loadHelpers();
    expect(() => ensureGit()).not.toThrow();
  });

  it("should call process.exit(1) when git is not available", () => {
    const mockExecSync = vi.fn(() => {
      throw new Error("not found");
    });
    const mockExit = vi.fn(() => {
      throw new Error("exit");
    });
    const mockConsole = {
      log: vi.fn(),
      error: vi.fn(),
    };

    const { ensureGit } = loadHelpers({
      execSync: mockExecSync,
      processExit: mockExit,
      console: mockConsole,
    });

    expect(() => ensureGit()).toThrow("exit");
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockConsole.error.mock.calls[0][0]).toContain("https://git-scm.com/downloads");
  });
});

describe("showUsage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should output usage text to console", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { showUsage } = loadHelpers();

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

describe("readPackageVersion", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return version from a valid package.json", () => {
    const { readPackageVersion } = loadHelpers();
    const pkgPath = join(import.meta.dirname, "../../../package.json");
    const result = readPackageVersion(pkgPath);
    expect(typeof result).toBe("string");
    expect(result).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("should throw for a nonexistent package.json path", () => {
    const { readPackageVersion } = loadHelpers();
    expect(() => readPackageVersion("/nonexistent/package.json")).toThrow();
  });
});
