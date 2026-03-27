const path = require("path");
const fs = require("fs");
const { execFileSync } = require("child_process");
const crypto = require("crypto");

// Uses Vitest globals (describe, it, expect) — configured via globals: true in vitest.config.js

const ROOT = path.resolve(__dirname, "../../..");
const SCRIPT = path.join(ROOT, "bin/generate-checksums.js");
const CHECKSUMS_FILE = path.join(ROOT, "checksums.txt");

/**
 * Helper: run the generator script and return { stdout, exitCode }.
 * Throws on non-zero exit unless `expectFailure` is true.
 */
function runGenerator({ expectFailure = false, cwd = ROOT } = {}) {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT], {
      cwd,
      encoding: "utf8",
      env: { ...process.env },
    });
    return { stdout, exitCode: 0 };
  } catch (err) {
    if (expectFailure) {
      return { stdout: err.stdout || "", stderr: err.stderr || "", exitCode: err.status };
    }
    throw err;
  }
}

/**
 * Helper: parse checksums.txt content into an array of { hash, file } objects.
 */
function parseChecksums(content) {
  return content
    .trim()
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => {
      // BSD format: <hash>  <filename> (two spaces)
      const match = line.match(/^([a-f0-9]{64}) {2}(.+)$/);
      if (!match) throw new Error(`Invalid checksum line: ${line}`);
      return { hash: match[1], file: match[2] };
    });
}

describe("generate-checksums.js", () => {
  // Clean up any generated checksums.txt after each test
  afterEach(() => {
    try {
      if (fs.existsSync(CHECKSUMS_FILE)) {
        fs.unlinkSync(CHECKSUMS_FILE);
      }
    } catch {
      // ignore cleanup errors
    }
  });

  it("should exist as a script file", () => {
    expect(fs.existsSync(SCRIPT)).toBe(true);
  });

  it("should be valid Node.js syntax", () => {
    expect(() => {
      execFileSync(process.execPath, ["--check", SCRIPT]);
    }).not.toThrow();
  });

  describe("happy path — checksums.txt generation", () => {
    it("should generate checksums.txt in the project root", () => {
      runGenerator();
      expect(fs.existsSync(CHECKSUMS_FILE)).toBe(true);
    });

    it("should use BSD-compatible format with two spaces between hash and filename", () => {
      runGenerator();
      const content = fs.readFileSync(CHECKSUMS_FILE, "utf8");
      const lines = content.trim().split("\n").filter(Boolean);
      for (const line of lines) {
        // Exactly 64 hex chars, two spaces, then a relative path
        expect(line).toMatch(/^[a-f0-9]{64} {2}.+$/);
      }
    });

    it("should include package.json in the checksums", () => {
      runGenerator();
      const content = fs.readFileSync(CHECKSUMS_FILE, "utf8");
      const entries = parseChecksums(content);
      const packageEntry = entries.find((e) => e.file === "package.json");
      expect(packageEntry).toBeDefined();
    });

    it("should include all files from the package.json files array", () => {
      runGenerator();
      const content = fs.readFileSync(CHECKSUMS_FILE, "utf8");
      const entries = parseChecksums(content);
      const files = entries.map((e) => e.file);

      // At minimum, gaia-install.sh and bin/gaia-framework.js must be present
      expect(files).toContain("gaia-install.sh");
      expect(files.some((f) => f.startsWith("bin/"))).toBe(true);
    });

    it("should produce correct sha256 hashes for each file", () => {
      runGenerator();
      const content = fs.readFileSync(CHECKSUMS_FILE, "utf8");
      const entries = parseChecksums(content);

      for (const entry of entries) {
        const filePath = path.join(ROOT, entry.file);
        const fileContent = fs.readFileSync(filePath);
        const expectedHash = crypto.createHash("sha256").update(fileContent).digest("hex");
        expect(entry.hash).toBe(expectedHash);
      }
    });

    it("should use relative paths (no leading slash or absolute paths)", () => {
      runGenerator();
      const content = fs.readFileSync(CHECKSUMS_FILE, "utf8");
      const entries = parseChecksums(content);
      for (const entry of entries) {
        expect(entry.file).not.toMatch(/^\//);
        expect(entry.file).not.toMatch(/^[A-Z]:\\/);
      }
    });

    it("should produce identical output on re-run (idempotency)", () => {
      runGenerator();
      const first = fs.readFileSync(CHECKSUMS_FILE, "utf8");
      runGenerator();
      const second = fs.readFileSync(CHECKSUMS_FILE, "utf8");
      expect(first).toBe(second);
    });
  });

  describe("error handling", () => {
    it("should exit non-zero when a file in files array is missing", () => {
      // Temporarily rename gaia-install.sh to simulate a missing file
      const target = path.join(ROOT, "gaia-install.sh");
      const backup = target + ".bak";
      let renamed = false;
      try {
        if (fs.existsSync(target)) {
          fs.renameSync(target, backup);
          renamed = true;
        }
        const result = runGenerator({ expectFailure: true });
        expect(result.exitCode).not.toBe(0);
      } finally {
        if (renamed) {
          fs.renameSync(backup, target);
        }
      }
    });

    it("should exit non-zero when a file is zero bytes", () => {
      // Temporarily replace gaia-install.sh with an empty file
      const target = path.join(ROOT, "gaia-install.sh");
      const backup = target + ".bak";
      const originalContent = fs.readFileSync(target);
      try {
        fs.copyFileSync(target, backup);
        fs.writeFileSync(target, "");
        const result = runGenerator({ expectFailure: true });
        expect(result.exitCode).not.toBe(0);
      } finally {
        fs.writeFileSync(target, originalContent);
        if (fs.existsSync(backup)) fs.unlinkSync(backup);
      }
    });
  });

  describe("verification compatibility (AC3, AC5)", () => {
    it("should be verifiable with shasum -a 256 -c", () => {
      runGenerator();
      // Run shasum -a 256 -c checksums.txt from project root
      expect(() => {
        execFileSync("shasum", ["-a", "256", "-c", "checksums.txt"], {
          cwd: ROOT,
          encoding: "utf8",
        });
      }).not.toThrow();
    });
  });
});
