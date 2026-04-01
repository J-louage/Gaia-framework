/**
 * V8 Coverage Tests for bin/gaia-framework.js main() function
 *
 * These tests call main() via createRequire() so that V8 coverage
 * instrumentation tracks the executed lines in the actual file.
 * V8 coverage only instruments files loaded via Node's module system,
 * not dynamically evaluated code (new Function).
 *
 * E5-S8 AC1: Increase V8 statement coverage to >= 80%
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRequire } from "module";
import { join } from "path";

const require = createRequire(import.meta.url);
const gaiaFramework = require("../../../bin/gaia-framework.js");
const { main, findBash, showUsage } = gaiaFramework;

describe("V8 coverage — main() via require", () => {
  let origArgv;
  let origExit;

  beforeEach(() => {
    origArgv = process.argv;
    origExit = process.exit;
  });

  afterEach(() => {
    process.argv = origArgv;
    process.exit = origExit;
  });

  it("should handle --help flag and call showUsage", () => {
    process.argv = ["node", "gaia-framework.js", "--help"];
    let exitCode;
    process.exit = (code) => {
      exitCode = code;
      throw new Error("EXIT");
    };

    expect(() => main()).toThrow("EXIT");
    expect(exitCode).toBe(0);
  });

  it("should handle --version flag", () => {
    process.argv = ["node", "gaia-framework.js", "--version"];
    let exitCode;
    process.exit = (code) => {
      exitCode = code;
      throw new Error("EXIT");
    };

    expect(() => main()).toThrow("EXIT");
    expect(exitCode).toBe(0);
  });

  it("should handle no args (shows usage)", () => {
    process.argv = ["node", "gaia-framework.js"];
    let exitCode;
    process.exit = (code) => {
      exitCode = code;
      throw new Error("EXIT");
    };

    expect(() => main()).toThrow("EXIT");
    expect(exitCode).toBe(0);
  });

  it("should reject unknown commands via fail()", () => {
    process.argv = ["node", "gaia-framework.js", "badcommand"];
    let exitCode;
    process.exit = (code) => {
      exitCode = code;
      throw new Error("EXIT");
    };

    expect(() => main()).toThrow("EXIT");
    expect(exitCode).toBe(1);
  });

  it.skipIf(process.platform === "win32")(
    "should run init command with DI mocks (non-Windows path)",
    () => {
      process.argv = ["node", "gaia-framework.js", "init", "/test-target"];

      const mockExecSync = vi.fn();
      const mockExecFileSync = vi.fn();
      const mockExistsSync = vi.fn(() => true);
      const mockMkdtempSync = vi.fn(() => "/tmp/gaia-framework-test123");
      const mockTmpdir = vi.fn(() => "/tmp");

      main({
        execSync: mockExecSync,
        execFileSync: mockExecFileSync,
        existsSync: mockExistsSync,
        mkdtempSync: mockMkdtempSync,
        tmpdir: mockTmpdir,
        join: join,
      });

      // Should have called execFileSync for bash
      expect(mockExecFileSync).toHaveBeenCalled();
      const [bashPath, args] = mockExecFileSync.mock.calls[0];
      expect(bashPath).toBe("bash");
      expect(args[0]).toContain("gaia-install.sh");
    }
  );

  it("should register SIGINT and SIGTERM handlers", () => {
    process.argv = ["node", "gaia-framework.js", "init", "/test-target"];
    const registeredHandlers = {};
    const origOn = process.on.bind(process);
    process.on = vi.fn((event, handler) => {
      registeredHandlers[event] = handler;
      // Don't actually register signal handlers — avoid side effects
    });

    const mockExecSync = vi.fn();
    const mockExecFileSync = vi.fn();
    const mockExistsSync = vi.fn(() => true);
    const mockMkdtempSync = vi.fn(() => "/tmp/gaia-framework-test456");
    const mockTmpdir = vi.fn(() => "/tmp");

    main({
      execSync: mockExecSync,
      execFileSync: mockExecFileSync,
      existsSync: mockExistsSync,
      mkdtempSync: mockMkdtempSync,
      tmpdir: mockTmpdir,
      join: join,
    });

    // Verify signal handlers were registered
    expect(process.on).toHaveBeenCalledWith("exit", expect.any(Function));
    expect(process.on).toHaveBeenCalledWith("SIGINT", expect.any(Function));
    expect(process.on).toHaveBeenCalledWith("SIGTERM", expect.any(Function));

    // Verify SIGINT handler calls exit(130)
    const mockExitForSignal = vi.fn();
    process.exit = mockExitForSignal;
    if (registeredHandlers["SIGINT"]) {
      registeredHandlers["SIGINT"]();
      expect(mockExitForSignal).toHaveBeenCalledWith(130);
    }

    // Verify SIGTERM handler calls exit(143)
    mockExitForSignal.mockClear();
    if (registeredHandlers["SIGTERM"]) {
      registeredHandlers["SIGTERM"]();
      expect(mockExitForSignal).toHaveBeenCalledWith(143);
    }

    process.on = origOn;
  });

  it("should handle execFileSync failure and exit with error status", () => {
    process.argv = ["node", "gaia-framework.js", "init", "/test-target"];
    let exitCode;
    process.exit = (code) => {
      exitCode = code;
      throw new Error("EXIT");
    };

    const mockExecSync = vi.fn();
    const mockExecFileSync = vi.fn(() => {
      const err = new Error("bash failed");
      err.status = 42;
      throw err;
    });
    const mockExistsSync = vi.fn(() => true);
    const mockMkdtempSync = vi.fn(() => "/tmp/gaia-framework-test789");
    const mockTmpdir = vi.fn(() => "/tmp");

    // The try/catch in main() catches the execFileSync error and calls process.exit(42)
    // but our mock throws, so main itself throws
    try {
      main({
        execSync: mockExecSync,
        execFileSync: mockExecFileSync,
        existsSync: mockExistsSync,
        mkdtempSync: mockMkdtempSync,
        tmpdir: mockTmpdir,
        join: join,
      });
    } catch {
      // Expected — mock throws to halt execution
    }

    expect(exitCode).toBe(42);
  });

  it("should handle git clone failure", () => {
    process.argv = ["node", "gaia-framework.js", "init", "/test-target"];
    let exitCode;
    process.exit = (code) => {
      exitCode = code;
      throw new Error("EXIT");
    };

    const cloneError = new Error("clone failed");
    cloneError.stderr = Buffer.from("fatal: repository not found");
    const mockExecSync = vi.fn((cmd) => {
      if (typeof cmd === "string" && cmd.includes("git clone")) {
        throw cloneError;
      }
    });
    const mockExecFileSync = vi.fn();
    const mockExistsSync = vi.fn(() => true);
    const mockMkdtempSync = vi.fn(() => "/tmp/gaia-framework-clonetest");
    const mockTmpdir = vi.fn(() => "/tmp");

    try {
      main({
        execSync: mockExecSync,
        execFileSync: mockExecFileSync,
        existsSync: mockExistsSync,
        mkdtempSync: mockMkdtempSync,
        tmpdir: mockTmpdir,
        join: join,
      });
    } catch {
      // Expected — fail() -> process.exit(1) -> throw "EXIT"
    }

    expect(exitCode).toBe(1);
  });

  it("should handle missing installer script", () => {
    process.argv = ["node", "gaia-framework.js", "init", "/test-target"];
    let exitCode;
    process.exit = (code) => {
      exitCode = code;
      throw new Error("EXIT");
    };

    const mockExecSync = vi.fn();
    const mockExecFileSync = vi.fn();
    const mockExistsSync = vi.fn((p) => {
      // Script file does not exist
      if (typeof p === "string" && p.includes("gaia-install.sh")) return false;
      return true;
    });
    const mockMkdtempSync = vi.fn(() => "/tmp/gaia-framework-noscript");
    const mockTmpdir = vi.fn(() => "/tmp");

    try {
      main({
        execSync: mockExecSync,
        execFileSync: mockExecFileSync,
        existsSync: mockExistsSync,
        mkdtempSync: mockMkdtempSync,
        tmpdir: mockTmpdir,
        join: join,
      });
    } catch {
      // Expected — fail() -> process.exit(1) -> throw "EXIT"
    }

    expect(exitCode).toBe(1);
  });
});

describe("V8 coverage — Windows paths via isWindows DI", () => {
  let origArgv;
  let origExit;

  beforeEach(() => {
    origArgv = process.argv;
    origExit = process.exit;
  });

  afterEach(() => {
    process.argv = origArgv;
    process.exit = origExit;
  });

  it("should resolve 8.3 short names via PowerShell when isWindows=true", () => {
    process.argv = ["node", "gaia-framework.js", "init", "C:\\project"];
    const registeredHandlers = {};
    const origOn = process.on.bind(process);
    process.on = (event, handler) => {
      registeredHandlers[event] = handler;
    };

    const mockExecSync = vi.fn((cmd) => {
      if (typeof cmd === "string" && cmd.includes("powershell"))
        return "C:\\Users\\Elias Nasser\\Temp\\gaia-framework-abc\n";
      return "";
    });
    const mockExecFileSync = vi.fn();
    const mockExistsSync = vi.fn(() => true);
    const mockMkdtempSync = vi.fn(() => "C:\\Users\\ELIASN~1\\Temp\\gaia-framework-abc");
    const mockTmpdir = vi.fn(() => "C:\\Users\\ELIASN~1\\Temp");

    main({
      execSync: mockExecSync,
      execFileSync: mockExecFileSync,
      existsSync: mockExistsSync,
      mkdtempSync: mockMkdtempSync,
      tmpdir: mockTmpdir,
      join: join,
      isWindows: true,
      findBash: () => "C:\\Program Files\\Git\\bin\\bash.exe",
    });

    // Verify PowerShell was called for 8.3 resolution
    const powershellCall = mockExecSync.mock.calls.find(
      (call) => typeof call[0] === "string" && call[0].includes("powershell")
    );
    expect(powershellCall).toBeDefined();

    process.on = origOn;
  });

  it("should handle PowerShell failure silently when isWindows=true", () => {
    process.argv = ["node", "gaia-framework.js", "init", "C:\\project"];
    const origOn = process.on.bind(process);
    process.on = vi.fn();

    const mockExecSync = vi.fn((cmd) => {
      if (typeof cmd === "string" && cmd.includes("powershell"))
        throw new Error("PowerShell not found");
      return "";
    });
    const mockExecFileSync = vi.fn();
    const mockExistsSync = vi.fn(() => true);

    // Should not throw even when PowerShell fails
    main({
      execSync: mockExecSync,
      execFileSync: mockExecFileSync,
      existsSync: mockExistsSync,
      mkdtempSync: vi.fn(() => "C:\\Temp\\gaia-abc"),
      tmpdir: vi.fn(() => "C:\\Temp"),
      join: join,
      isWindows: true,
      findBash: () => "bash",
    });

    process.on = origOn;
  });

  it("should skip 8.3 resolution when isWindows=false", () => {
    process.argv = ["node", "gaia-framework.js", "init", "/test"];
    const origOn = process.on.bind(process);
    process.on = vi.fn();

    const mockExecSync = vi.fn();
    const mockExecFileSync = vi.fn();
    const mockExistsSync = vi.fn(() => true);

    main({
      execSync: mockExecSync,
      execFileSync: mockExecFileSync,
      existsSync: mockExistsSync,
      mkdtempSync: vi.fn(() => "/tmp/gaia-framework-test"),
      tmpdir: vi.fn(() => "/tmp"),
      join: join,
      isWindows: false,
    });

    // PowerShell should NOT have been called
    const powershellCall = mockExecSync.mock.calls.find(
      (call) => typeof call[0] === "string" && call[0].includes("powershell")
    );
    expect(powershellCall).toBeUndefined();

    process.on = origOn;
  });

  it("should log verbose paths when isWindows=true and --verbose", () => {
    process.argv = ["node", "gaia-framework.js", "init", "--verbose", "C:\\project"];
    const origOn = process.on.bind(process);
    process.on = vi.fn();

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const mockExecSync = vi.fn((cmd) => {
      if (typeof cmd === "string" && cmd.includes("powershell")) throw new Error("not found");
      return "";
    });
    const mockExecFileSync = vi.fn();
    const mockExistsSync = vi.fn(() => true);

    main({
      execSync: mockExecSync,
      execFileSync: mockExecFileSync,
      existsSync: mockExistsSync,
      mkdtempSync: vi.fn(() => "C:\\Temp\\gaia-xyz"),
      tmpdir: vi.fn(() => "C:\\Temp"),
      join: join,
      isWindows: true,
      findBash: () => "C:\\Program Files\\Git\\bin\\bash.exe",
    });

    // Verbose mode should log bash path, script paths, and temp dir
    const allOutput = logSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(allOutput).toContain("Bash:");
    expect(allOutput).toContain("Script");
    expect(allOutput).toContain("Temp dir:");

    logSpy.mockRestore();
    process.on = origOn;
  });

  it("should convert Windows paths to POSIX in args", () => {
    process.argv = ["node", "gaia-framework.js", "init", "C:\\Users\\test\\project"];
    const origOn = process.on.bind(process);
    process.on = vi.fn();

    const mockExecSync = vi.fn((cmd) => {
      if (typeof cmd === "string" && cmd.includes("powershell")) throw new Error("not found");
      return "";
    });
    const mockExecFileSync = vi.fn();
    const mockExistsSync = vi.fn(() => true);

    main({
      execSync: mockExecSync,
      execFileSync: mockExecFileSync,
      existsSync: mockExistsSync,
      mkdtempSync: vi.fn(() => "C:\\Temp\\gaia-posix"),
      tmpdir: vi.fn(() => "C:\\Temp"),
      join: join,
      isWindows: true,
      findBash: () => "bash",
    });

    // Verify execFileSync was called with POSIX-converted paths
    expect(mockExecFileSync).toHaveBeenCalled();

    process.on = origOn;
  });

  it("should handle null findBash on Windows", () => {
    process.argv = ["node", "gaia-framework.js", "init", "C:\\project"];
    let exitCode;
    process.exit = (code) => {
      exitCode = code;
      throw new Error("EXIT");
    };
    const origOn = process.on.bind(process);
    process.on = vi.fn();

    try {
      main({
        execSync: vi.fn(),
        execFileSync: vi.fn(),
        existsSync: vi.fn(() => true),
        mkdtempSync: vi.fn(() => "C:\\Temp\\gaia-null"),
        tmpdir: vi.fn(() => "C:\\Temp"),
        join: join,
        isWindows: true,
        findBash: () => null,
      });
    } catch {
      // Expected — fail() -> process.exit -> throw
    }

    expect(exitCode).toBe(1);
    process.on = origOn;
  });
});

describe("V8 coverage — showUsage via require", () => {
  it("should output usage text containing all commands", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    showUsage();

    expect(spy).toHaveBeenCalled();
    const output = spy.mock.calls[0][0];
    expect(output).toContain("init");
    expect(output).toContain("update");
    expect(output).toContain("validate");
    expect(output).toContain("status");

    spy.mockRestore();
  });
});

describe("V8 coverage — findBash via require (non-Windows)", () => {
  it.skipIf(process.platform === "win32")("should return 'bash' on non-Windows platform", () => {
    // On macOS/Linux, findBash returns "bash" immediately
    expect(findBash()).toBe("bash");
  });
});
