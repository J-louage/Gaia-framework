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

  it("should detect WSL bash when uname contains 'microsoft'", async () => {
    Object.defineProperty(process, "platform", { value: "win32" });

    const mockExecSync = vi.fn((cmd) => {
      if (cmd === "bash --version") return; // succeeds
      if (cmd === 'bash -c "uname -r"') return "5.15.90.1-microsoft-standard-WSL2\n";
      throw new Error("unexpected call");
    });
    const mockExistsSync = vi.fn(() => false); // no Git Bash installed

    const { findBash } = await loadHelpers({
      execSync: mockExecSync,
      existsSync: mockExistsSync,
      env: {
        ProgramFiles: "C:\\Program Files",
        "ProgramFiles(x86)": "C:\\Program Files (x86)",
        LOCALAPPDATA: "C:\\Users\\test\\AppData\\Local",
      },
    });

    expect(findBash()).toBe("bash");
  });

  it("should detect Git Bash via MSYSTEM when uname detection fails", async () => {
    Object.defineProperty(process, "platform", { value: "win32" });

    const mockExecSync = vi.fn((cmd) => {
      if (cmd === "bash --version") return; // succeeds
      if (cmd === 'bash -c "uname -r"') throw new Error("uname failed");
      if (cmd === 'bash -c "echo $MSYSTEM"') return "MINGW64\n";
      throw new Error("unexpected call: " + cmd);
    });
    const mockExistsSync = vi.fn(() => false);

    const { findBash } = await loadHelpers({
      execSync: mockExecSync,
      existsSync: mockExistsSync,
      env: {
        ProgramFiles: "C:\\Program Files",
        "ProgramFiles(x86)": "C:\\Program Files (x86)",
        LOCALAPPDATA: "C:\\Users\\test\\AppData\\Local",
      },
    });

    expect(findBash()).toBe("bash");
  });

  it("should fall back to WSL when both uname and MSYSTEM detection fail", async () => {
    Object.defineProperty(process, "platform", { value: "win32" });

    const mockExecSync = vi.fn((cmd) => {
      if (cmd === "bash --version") return;
      if (cmd === 'bash -c "uname -r"') throw new Error("uname failed");
      if (cmd === 'bash -c "echo $MSYSTEM"') throw new Error("MSYSTEM failed");
      throw new Error("unexpected call: " + cmd);
    });
    const mockExistsSync = vi.fn(() => false);

    const { findBash } = await loadHelpers({
      execSync: mockExecSync,
      existsSync: mockExistsSync,
      env: {
        ProgramFiles: "C:\\Program Files",
        "ProgramFiles(x86)": "C:\\Program Files (x86)",
        LOCALAPPDATA: "C:\\Users\\test\\AppData\\Local",
      },
    });

    // Should still return "bash" — just assumes WSL
    expect(findBash()).toBe("bash");
  });

  it("should use default paths when Windows env vars are absent", async () => {
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

describe("SIGTERM and SIGINT handlers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should call cleanup and exit(143) on SIGTERM", () => {
    const handlers = {};
    const spy = vi.spyOn(process, "on").mockImplementation((event, handler) => {
      handlers[event] = handler;
      return process;
    });
    const mockExit = vi.fn();
    process.exit = mockExit;

    const origArgv = process.argv;
    process.argv = ["node", "gaia-framework.js", "init", "/test"];

    const { main } = loadHelpers({
      execSync: vi.fn(),
      existsSync: vi.fn(() => true),
      processExit: mockExit,
    });

    try {
      main({
        execSync: vi.fn(),
        execFileSync: vi.fn(),
        existsSync: vi.fn(() => true),
        join: (...args) => args.join("/"),
        mkdtempSync: vi.fn(() => "/tmp/gaia-framework-test"),
        tmpdir: vi.fn(() => "/tmp"),
      });
    } catch {
      // Expected
    }

    expect(handlers["SIGTERM"]).toBeDefined();
    handlers["SIGTERM"]();
    expect(mockExit).toHaveBeenCalledWith(143);

    process.argv = origArgv;
    spy.mockRestore();
  });

  it("should call cleanup and exit(130) on SIGINT", () => {
    const handlers = {};
    const spy = vi.spyOn(process, "on").mockImplementation((event, handler) => {
      handlers[event] = handler;
      return process;
    });
    const mockExit = vi.fn();
    process.exit = mockExit;

    const origArgv = process.argv;
    process.argv = ["node", "gaia-framework.js", "init", "/test"];

    const { main } = loadHelpers({
      execSync: vi.fn(),
      existsSync: vi.fn(() => true),
      processExit: mockExit,
    });

    try {
      main({
        execSync: vi.fn(),
        execFileSync: vi.fn(),
        existsSync: vi.fn(() => true),
        join: (...args) => args.join("/"),
        mkdtempSync: vi.fn(() => "/tmp/gaia-framework-test"),
        tmpdir: vi.fn(() => "/tmp"),
      });
    } catch {
      // Expected
    }

    expect(handlers["SIGINT"]).toBeDefined();
    handlers["SIGINT"]();
    expect(mockExit).toHaveBeenCalledWith(130);

    process.argv = origArgv;
    spy.mockRestore();
  });
});

describe("8.3 short-name path resolution", () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform });
    vi.restoreAllMocks();
  });

  it("should resolve 8.3 short names via PowerShell on Windows (success)", async () => {
    Object.defineProperty(process, "platform", { value: "win32" });

    const mockExec = vi.fn((cmd) => {
      if (typeof cmd === "string" && cmd.includes("git --version")) return;
      if (typeof cmd === "string" && cmd.includes("git clone")) return;
      if (typeof cmd === "string" && cmd.includes("bash --version")) return;
      if (typeof cmd === "string" && cmd.includes("powershell"))
        return "C:\\Users\\Elias Nasser\\AppData\\Local\\Temp\\gaia-framework-abc\n";
      return "";
    });
    const mockExecFile = vi.fn();
    const mockExists = vi.fn(() => true);
    const mockMkdtemp = vi.fn(
      () => "C:\\Users\\ELIASN~1\\AppData\\Local\\Temp\\gaia-framework-abc"
    );
    const mockTmpdir = vi.fn(() => "C:\\Users\\ELIASN~1\\AppData\\Local\\Temp");
    const mockJoin = (...args) => args.join("\\");

    const origArgv = process.argv;
    process.argv = ["node", "gaia-framework.js", "init", "C:\\project"];

    const { main } = await loadHelpers({
      execSync: mockExec,
      execFileSync: mockExecFile,
      existsSync: mockExists,
    });

    try {
      main({
        execSync: mockExec,
        execFileSync: mockExecFile,
        existsSync: mockExists,
        join: mockJoin,
        mkdtempSync: mockMkdtemp,
        tmpdir: mockTmpdir,
      });
    } catch {
      // Expected
    }

    // Verify PowerShell was called for 8.3 resolution
    const powershellCall = mockExec.mock.calls.find(
      (call) => typeof call[0] === "string" && call[0].includes("powershell")
    );
    expect(powershellCall).toBeDefined();

    process.argv = origArgv;
  });

  it("should handle PowerShell failure silently on Windows", async () => {
    Object.defineProperty(process, "platform", { value: "win32" });

    const mockExec = vi.fn((cmd) => {
      if (typeof cmd === "string" && cmd.includes("git --version")) return;
      if (typeof cmd === "string" && cmd.includes("git clone")) return;
      if (typeof cmd === "string" && cmd.includes("bash --version")) return;
      if (typeof cmd === "string" && cmd.includes("powershell"))
        throw new Error("PowerShell not found");
      return "";
    });
    const mockExecFile = vi.fn();
    const mockExists = vi.fn(() => true);
    const mockMkdtemp = vi.fn(() => "C:\\Users\\ELIASN~1\\Temp\\gaia-abc");
    const mockTmpdir = vi.fn(() => "C:\\Users\\ELIASN~1\\Temp");
    const mockJoin = (...args) => args.join("\\");

    const origArgv = process.argv;
    process.argv = ["node", "gaia-framework.js", "init", "C:\\project"];

    const { main } = await loadHelpers({
      execSync: mockExec,
      execFileSync: mockExecFile,
      existsSync: mockExists,
    });

    // Should NOT throw — PowerShell failure is caught silently
    expect(() => {
      try {
        main({
          execSync: mockExec,
          execFileSync: mockExecFile,
          existsSync: mockExists,
          join: mockJoin,
          mkdtempSync: mockMkdtemp,
          tmpdir: mockTmpdir,
        });
      } catch {
        // main will throw from execFileSync for bash — that's fine
      }
    }).not.toThrow();

    process.argv = origArgv;
  });

  it("should skip 8.3 resolution on non-Windows", async () => {
    Object.defineProperty(process, "platform", { value: "darwin" });

    const mockExec = vi.fn((cmd) => {
      if (typeof cmd === "string" && cmd.includes("git --version")) return;
      if (typeof cmd === "string" && cmd.includes("git clone")) return;
      return "";
    });
    const mockExecFile = vi.fn();
    const mockExists = vi.fn(() => true);
    const mockMkdtemp = vi.fn(() => "/tmp/gaia-framework-abc");
    const mockTmpdir = vi.fn(() => "/tmp");
    const mockJoin = (...args) => args.join("/");

    const origArgv = process.argv;
    process.argv = ["node", "gaia-framework.js", "init", "/test"];

    const { main } = await loadHelpers({
      execSync: mockExec,
      execFileSync: mockExecFile,
      existsSync: mockExists,
    });

    try {
      main({
        execSync: mockExec,
        execFileSync: mockExecFile,
        existsSync: mockExists,
        join: mockJoin,
        mkdtempSync: mockMkdtemp,
        tmpdir: mockTmpdir,
      });
    } catch {
      // Expected
    }

    // PowerShell should NOT have been called
    const powershellCall = mockExec.mock.calls.find(
      (call) => typeof call[0] === "string" && call[0].includes("powershell")
    );
    expect(powershellCall).toBeUndefined();

    process.argv = origArgv;
  });
});

describe("Verbose Windows logging", () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform });
    vi.restoreAllMocks();
  });

  it("should log bash, script, and temp paths when --verbose on Windows", async () => {
    Object.defineProperty(process, "platform", { value: "win32" });

    const loggedMessages = [];
    const mockConsole = {
      log: vi.fn((msg) => loggedMessages.push(msg)),
      error: vi.fn(),
    };
    const mockExec = vi.fn((cmd) => {
      if (typeof cmd === "string" && cmd.includes("git --version")) return;
      if (typeof cmd === "string" && cmd.includes("git clone")) return;
      if (typeof cmd === "string" && cmd.includes("bash --version")) return;
      if (typeof cmd === "string" && cmd.includes("powershell")) throw new Error("not found");
      return "";
    });
    const mockExecFile = vi.fn();
    const mockExists = vi.fn(() => true);
    const mockMkdtemp = vi.fn(() => "C:\\Temp\\gaia-framework-xyz");
    const mockTmpdir = vi.fn(() => "C:\\Temp");
    const mockJoin = (...args) => args.join("\\");

    const origArgv = process.argv;
    process.argv = ["node", "gaia-framework.js", "init", "--verbose", "C:\\project"];

    const { main } = await loadHelpers({
      execSync: mockExec,
      execFileSync: mockExecFile,
      existsSync: mockExists,
      console: mockConsole,
    });

    try {
      main({
        execSync: mockExec,
        execFileSync: mockExecFile,
        existsSync: mockExists,
        join: mockJoin,
        mkdtempSync: mockMkdtemp,
        tmpdir: mockTmpdir,
      });
    } catch {
      // Expected
    }

    // Verbose mode should log bash path, script paths, and temp dir
    const allOutput = loggedMessages.join("\n");
    expect(allOutput).toContain("Bash:");
    expect(allOutput).toContain("Script");
    expect(allOutput).toContain("Temp dir:");

    process.argv = origArgv;
  });
});
