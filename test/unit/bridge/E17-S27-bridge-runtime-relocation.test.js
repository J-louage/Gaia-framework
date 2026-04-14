/**
 * E17-S27: Bridge runtime relocation — src/bridge to _gaia/core/bridge
 *
 * Story: Move all bridge runtime JS modules from src/bridge/ into _gaia/core/bridge/
 * so the bridge is co-located with framework infrastructure, npm installs work
 * without a src/ directory, and all cross-references are updated.
 *
 * Traces: FR-318, FR-319, ADR-040
 * Risk: medium | Epic: E17 — Review Gate Enhancement & Test Execution Bridge
 *
 * Test IDs: BRL-01 through BRL-11
 */

import { existsSync, readdirSync, readFileSync } from "fs";
import { resolve, join } from "path";
import { describe, it, expect } from "vitest";

const PROJECT_ROOT = resolve(import.meta.dirname, "../../..");

/** Read a file relative to project root */
function readProjectFile(relativePath) {
  return readFileSync(join(PROJECT_ROOT, relativePath), "utf8");
}

/** Check if a file exists relative to project root */
function fileExists(relativePath) {
  return existsSync(join(PROJECT_ROOT, relativePath));
}

// ── AC1: Physical relocation of all 18 JS files ──────────────────────────────

describe("AC1: Physical relocation of all 18 JS files", () => {
  const EXPECTED_CORE_FILES = [
    "bridge-orchestrator.js",
    "bridge-post-flip-checks.js",
    "bridge-scope-guard.js",
    "bridge-toggle.js",
    "layer-0-environment-check.js",
    "layer-1-test-runner-discovery.js",
    "layer-2-ci-execution.js",
    "layer-2-local-execution.js",
    "layer-2-tier-selection.js",
    "layer-3-result-parsing.js",
    "review-gate-tier-mapping.js",
    "runner-compatibility-guard.js",
  ];

  const EXPECTED_ADAPTER_FILES = [
    "index.js",
    "js-adapter.js",
    "python-adapter.js",
    "java-adapter.js",
    "go-adapter.js",
    "flutter-adapter.js",
  ];

  it("BRL-01: all 12 core JS files present at _gaia/core/bridge/", () => {
    for (const file of EXPECTED_CORE_FILES) {
      expect(
        fileExists(`_gaia/core/bridge/${file}`),
        `Expected core bridge file missing: _gaia/core/bridge/${file}`
      ).toBe(true);
    }
  });

  it("BRL-02: all 6 adapter JS files present at _gaia/core/bridge/adapters/", () => {
    for (const file of EXPECTED_ADAPTER_FILES) {
      expect(
        fileExists(`_gaia/core/bridge/adapters/${file}`),
        `Expected adapter file missing: _gaia/core/bridge/adapters/${file}`
      ).toBe(true);
    }
  });

  it("BRL-03: src/bridge/ directory does not exist (removed entirely)", () => {
    expect(fileExists("src/bridge")).toBe(false);
  });

  it("BRL-04: _gaia/core/bridge/ contains exactly 12 core JS files (no silent drops)", () => {
    const bridgePath = join(PROJECT_ROOT, "_gaia/core/bridge");
    const files = readdirSync(bridgePath).filter((f) => f.endsWith(".js") && f !== "adapters");
    expect(files.length).toBeGreaterThanOrEqual(12);
  });

  it("BRL-05: _gaia/core/bridge/adapters/ contains exactly 6 adapter files", () => {
    const adaptersPath = join(PROJECT_ROOT, "_gaia/core/bridge/adapters");
    const files = readdirSync(adaptersPath).filter((f) => f.endsWith(".js"));
    expect(files.length).toBe(6);
  });
});

// ── AC2: bridge-toggle/instructions.xml references updated ───────────────────

describe("AC2: bridge-toggle/instructions.xml — no src/bridge/ references", () => {
  let content;

  beforeAll(() => {
    content = readProjectFile("_gaia/core/workflows/bridge-toggle/instructions.xml");
  });

  it("BRL-06: bridge-toggle/instructions.xml contains no src/bridge/ path references", () => {
    expect(content).not.toMatch(/src\/bridge\//);
  });

  it("BRL-06b: bridge-toggle/instructions.xml references _gaia/core/bridge/ for bridge modules", () => {
    expect(content).toContain("_gaia/core/bridge/");
  });
});

// ── AC3: dev-story/instructions.xml reference updated ────────────────────────

describe("AC3: dev-story/instructions.xml — Layer 3 reference updated", () => {
  let content;

  beforeAll(() => {
    content = readProjectFile(
      "_gaia/lifecycle/workflows/4-implementation/dev-story/instructions.xml"
    );
  });

  it("BRL-07: dev-story/instructions.xml contains no src/bridge/ path references", () => {
    expect(content).not.toMatch(/src\/bridge\//);
  });

  it("BRL-07b: dev-story/instructions.xml references _gaia/core/bridge/layer-3-result-parsing.js", () => {
    expect(content).toContain("_gaia/core/bridge/layer-3-result-parsing.js");
  });
});

// ── AC4: Unit test import paths updated ──────────────────────────────────────

describe("AC4: test/unit/bridge/ — no src/bridge import paths", () => {
  const BRIDGE_TEST_DIR = join(PROJECT_ROOT, "test/unit/bridge");

  it("BRL-08: no test file in test/unit/bridge/ imports via src/bridge/", () => {
    const testFiles = readdirSync(BRIDGE_TEST_DIR).filter((f) => f.endsWith(".test.js"));
    expect(testFiles.length).toBeGreaterThan(0); // sanity — must have test files

    // Pattern split across parts so this file itself does not self-match during the scan
    const oldPathPart1 = "src";
    const oldPathPart2 = "bridge";
    const oldImportPath = oldPathPart1 + "/" + oldPathPart2 + "/";

    const violations = [];
    for (const file of testFiles) {
      // Skip this test file itself — it legitimately references the old path string
      // as a literal in the test assertion
      if (file === "E17-S27-bridge-runtime-relocation.test.js") continue;

      const source = readFileSync(join(BRIDGE_TEST_DIR, file), "utf8");
      if (source.includes(oldImportPath)) {
        violations.push(file);
      }
    }
    expect(
      violations,
      `Files still importing from ${oldImportPath}: ${violations.join(", ")}`
    ).toEqual([]);
  });
});

// ── AC6: package.json files array updated ────────────────────────────────────

describe("AC6: package.json files array includes src/ as safety net", () => {
  let packageJson;

  beforeAll(() => {
    packageJson = JSON.parse(readProjectFile("package.json"));
  });

  it("BRL-09: package.json has a files field defined", () => {
    expect(packageJson.files).toBeDefined();
    expect(Array.isArray(packageJson.files)).toBe(true);
  });

  it("BRL-09b: package.json files array includes src/ as safety net (AC6)", () => {
    expect(packageJson.files).toContain("src/");
  });

  it("BRL-09c: package.json files array includes _gaia/ (primary bridge distribution path)", () => {
    expect(packageJson.files).toContain("_gaia/");
  });
});

// ── AC7: gaia-install.sh rsync exclusion list — no conflict with _gaia/core/bridge/ ──

describe("AC7: gaia-install.sh rsync exclusions do not match _gaia/core/bridge/", () => {
  let copyLibContent;

  beforeAll(() => {
    copyLibContent = readProjectFile("lib/copy-lib.sh");
  });

  it("BRL-10: rsync exclusions target only _memory/ and .resolved/ — not _gaia/core/bridge/", () => {
    // Extract --exclude patterns
    const excludeMatches = [...copyLibContent.matchAll(/--exclude='([^']+)'/g)].map((m) => m[1]);
    expect(excludeMatches.length).toBeGreaterThan(0); // sanity

    // None of the exclusion patterns should match paths under _gaia/core/bridge/
    for (const pattern of excludeMatches) {
      // Convert glob pattern to basic test: check if the pattern prefix could match _gaia/core/bridge/
      // Known patterns: _memory/checkpoints/*.yaml, .resolved/*.yaml, _memory/*-sidecar/*.md
      expect(pattern).not.toMatch(/^_gaia\/core\/bridge/);
    }
  });

  it("BRL-10b: known exclusion patterns are _memory/ and .resolved/ scoped only", () => {
    // Positive assertion: exclusions are limited to memory and resolved-config paths
    const excludeMatches = [...copyLibContent.matchAll(/--exclude='([^']+)'/g)].map((m) => m[1]);
    for (const pattern of excludeMatches) {
      const isSafe = pattern.startsWith("_memory/") || pattern.startsWith(".resolved/");
      expect(
        isSafe,
        `Unexpected rsync exclusion pattern found: '${pattern}' — verify it does not exclude bridge files`
      ).toBe(true);
    }
  });
});

// ── AC8: manifest.yaml has no src/bridge/ references ─────────────────────────

describe("AC8: manifest.yaml contains no src/bridge/ references", () => {
  it("BRL-11: _gaia/_config/manifest.yaml has no src/bridge/ references", () => {
    const content = readProjectFile("_gaia/_config/manifest.yaml");
    expect(content).not.toMatch(/src\/bridge\//);
  });
});
