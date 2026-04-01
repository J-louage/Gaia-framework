import { vi } from "vitest";
import { createRequire } from "node:module";
import { join } from "path";

const require = createRequire(import.meta.url);

/**
 * Load main() and helper functions from gaia-framework.js with full mock injection.
 *
 * Uses require() with cache-busting instead of new Function() eval, so that V8
 * coverage can accurately instrument the source code (E3-S8).
 *
 * The CLI (bin/gaia-framework.js) checks `require.main === module` before calling
 * main(). Since require.main !== module when loaded from tests, main() is NOT
 * auto-executed.
 *
 * Strategy:
 * - main(deps) already accepts DI for execSync, execFileSync, existsSync, join,
 *   mkdtempSync, tmpdir — we pass mocks through deps.
 * - process.platform must be set before require() so IS_WINDOWS is correct.
 * - process.exit, process.argv, process.on, console.log/error are used dynamically
 *   by the source — we wrap main() to patch these around the call.
 *
 * @param {string} binDir - Absolute path to the bin/ directory
 * @param {object} mocks - Optional mock overrides
 * @returns {object} Exported functions + mocks object
 */
export function loadMain(binDir, mocks = {}) {
  const modulePath = join(binDir, "gaia-framework.js");

  // Clear the module cache so IS_WINDOWS is re-evaluated
  delete require.cache[modulePath];

  // Set platform before require so IS_WINDOWS is computed correctly
  const originalPlatform = process.platform;
  Object.defineProperty(process, "platform", {
    value: mocks.platform || "darwin",
    configurable: true,
  });

  // Patch child_process.execSync before require so that ensureGit() (called inside
  // main() without DI) and the git-version check in findBash() use the mock
  const realChildProcess = require("child_process");
  const origExecSync = realChildProcess.execSync;
  const realFs = require("fs");
  const origExistsSync = realFs.existsSync;

  const mockExecSync = mocks.execSync || vi.fn();
  const mockExistsSync = mocks.existsSync || vi.fn(() => true);

  realChildProcess.execSync = mockExecSync;
  realFs.existsSync = mockExistsSync;

  let exported;
  try {
    exported = require(modulePath);
  } finally {
    // Restore platform and module patches — they've been captured by the module
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
      configurable: true,
    });
    realChildProcess.execSync = origExecSync;
    realFs.existsSync = origExistsSync;
  }

  // Create mocks for dynamic globals
  const mockExecFileSync = mocks.execFileSync || vi.fn();
  const mockMkdtempSync = mocks.mkdtempSync || vi.fn(() => "/tmp/gaia-framework-abc123");
  const mockRmSync = mocks.rmSync || vi.fn();
  const mockTmpdir = mocks.tmpdir || vi.fn(() => "/tmp");
  const mockJoin = mocks.join || join;
  const mockExit = mocks.exit || vi.fn();
  const mockOn = mocks.on || vi.fn();
  const mockConsoleLog = mocks.consoleLog || vi.fn();
  const mockConsoleError = mocks.consoleError || vi.fn();

  // Wrap main() to patch dynamic globals around each call
  const wrappedMain = () => {
    const savedArgv = process.argv;
    const savedExit = process.exit;
    const savedOn = process.on;
    const savedEnv = process.env;
    const savedLog = console.log;
    const savedError = console.error;

    process.argv = mocks.argv || ["node", "gaia-framework"];
    process.exit = mockExit;
    process.on = mockOn;
    if (mocks.env) {
      process.env = { ...savedEnv, ...mocks.env };
    }
    console.log = mockConsoleLog;
    console.error = mockConsoleError;

    try {
      // Use DI pattern: main(deps) accepts overrides for captured module references
      exported.main({
        execSync: mockExecSync,
        execFileSync: mockExecFileSync,
        existsSync: mockExistsSync,
        join: mockJoin,
        mkdtempSync: mockMkdtempSync,
        tmpdir: mockTmpdir,
      });
    } finally {
      process.argv = savedArgv;
      process.exit = savedExit;
      process.on = savedOn;
      process.env = savedEnv;
      console.log = savedLog;
      console.error = savedError;
    }
  };

  return {
    main: wrappedMain,
    findBash: exported.findBash,
    ensureGit: exported.ensureGit,
    showUsage: exported.showUsage,
    fail: exported.fail,
    info: exported.info,
    cleanup: exported.cleanup,
    mocks: {
      execSync: mockExecSync,
      execFileSync: mockExecFileSync,
      mkdtempSync: mockMkdtempSync,
      rmSync: mockRmSync,
      existsSync: mockExistsSync,
      exit: mockExit,
      on: mockOn,
      consoleLog: mockConsoleLog,
      consoleError: mockConsoleError,
      process: {
        argv: mocks.argv || ["node", "gaia-framework"],
        platform: mocks.platform || "darwin",
        exit: mockExit,
        on: mockOn,
        env: mocks.env || {},
      },
    },
  };
}
