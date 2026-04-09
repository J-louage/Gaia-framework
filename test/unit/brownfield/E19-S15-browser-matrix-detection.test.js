/**
 * E19-S15: Brownfield Browser Matrix Detection — Acceptance Tests
 *
 * RED PHASE — these tests are intentionally failing.
 * The implementation module (src/brownfield/browser-matrix-detector.js) does
 * not exist yet.
 *
 * Story: As a brownfield user, I want /gaia-brownfield to detect the browser
 * matrix used for end-to-end testing so that the onboarding report captures
 * which browsers are in scope for UI test coverage.
 *
 * Covers: AC1-AC6 (BTI-19 through BTI-24)
 * Traces to: FR-234, NFR-041
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "path";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { tmpdir } from "os";

// Implementation under test
import { detectBrowserMatrix } from "../../../src/brownfield/browser-matrix-detector.js";

// ─── Test fixtures ────────────────────────────────────────────────────────────

const TMP_BASE = join(tmpdir(), "gaia-e19-s15-tests");

function createFixtureDir(name) {
  const dir = join(TMP_BASE, name);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanFixtures() {
  if (existsSync(TMP_BASE)) {
    rmSync(TMP_BASE, { recursive: true, force: true });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AC1: Playwright scanner
// ─────────────────────────────────────────────────────────────────────────────
describe("E19-S15 AC1: Playwright scanner", () => {
  let projectDir;

  beforeEach(() => {
    cleanFixtures();
    projectDir = createFixtureDir("ac1-playwright");
  });

  afterEach(() => {
    cleanFixtures();
  });

  it("BTI-19: detects playwright.config.ts with 3 projects (chromium, firefox, webkit)", async () => {
    writeFileSync(
      join(projectDir, "playwright.config.ts"),
      `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
`
    );

    const result = await detectBrowserMatrix(projectDir);
    expect(result).not.toBeNull();
    expect(result.browser_matrix).toHaveLength(3);
    const names = result.browser_matrix.map((b) => b.name);
    expect(names).toContain("chromium");
    expect(names).toContain("firefox");
    expect(names).toContain("webkit");
    for (const entry of result.browser_matrix) {
      expect(entry.config_source).toBe("playwright.config.ts");
    }
  });

  it("detects playwright.config.js", async () => {
    writeFileSync(
      join(projectDir, "playwright.config.js"),
      `module.exports = {
  projects: [
    { name: 'chromium' },
    { name: 'Mobile Chrome' },
  ],
};
`
    );

    const result = await detectBrowserMatrix(projectDir);
    expect(result).not.toBeNull();
    expect(result.browser_matrix).toHaveLength(2);
    expect(result.browser_matrix[0].config_source).toBe("playwright.config.js");
  });

  it("extracts Mobile Chrome and Mobile Safari project names", async () => {
    writeFileSync(
      join(projectDir, "playwright.config.ts"),
      `export default {
  projects: [
    { name: 'Mobile Chrome' },
    { name: 'Mobile Safari' },
  ],
};
`
    );

    const result = await detectBrowserMatrix(projectDir);
    expect(result).not.toBeNull();
    const names = result.browser_matrix.map((b) => b.name);
    expect(names).toContain("Mobile Chrome");
    expect(names).toContain("Mobile Safari");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC2: Cypress scanner
// ─────────────────────────────────────────────────────────────────────────────
describe("E19-S15 AC2: Cypress scanner", () => {
  let projectDir;

  beforeEach(() => {
    cleanFixtures();
    projectDir = createFixtureDir("ac2-cypress");
  });

  afterEach(() => {
    cleanFixtures();
  });

  it("BTI-20: detects cypress.config.js with browsers array", async () => {
    writeFileSync(
      join(projectDir, "cypress.config.js"),
      `module.exports = {
  e2e: {
    browsers: ['chrome', 'firefox'],
  },
};
`
    );

    const result = await detectBrowserMatrix(projectDir);
    expect(result).not.toBeNull();
    expect(result.browser_matrix).toHaveLength(2);
    const names = result.browser_matrix.map((b) => b.name);
    expect(names).toContain("chrome");
    expect(names).toContain("firefox");
    expect(result.browser_matrix[0].config_source).toBe("cypress.config.js");
  });

  it("detects cypress.config.ts", async () => {
    writeFileSync(
      join(projectDir, "cypress.config.ts"),
      `export default {
  browsers: ["chrome", "edge"],
};
`
    );

    const result = await detectBrowserMatrix(projectDir);
    expect(result).not.toBeNull();
    expect(result.browser_matrix).toHaveLength(2);
    expect(result.browser_matrix[0].config_source).toBe("cypress.config.ts");
  });

  it("detects cypress.json legacy config", async () => {
    writeFileSync(
      join(projectDir, "cypress.json"),
      JSON.stringify({ browsers: ["chrome", "firefox"] })
    );

    const result = await detectBrowserMatrix(projectDir);
    expect(result).not.toBeNull();
    expect(result.browser_matrix).toHaveLength(2);
    expect(result.browser_matrix[0].config_source).toBe("cypress.json");
  });

  it("detects cypress.config with no browsers key as presence-only signal", async () => {
    // When cypress is installed but no custom browsers list is set, we still
    // record cypress as a signal but cannot enumerate browsers — result is
    // an empty matrix or null. Choose: null (nothing definitive).
    writeFileSync(
      join(projectDir, "cypress.config.js"),
      `module.exports = { e2e: {} };
`
    );

    const result = await detectBrowserMatrix(projectDir);
    // No explicit browsers list and no other tools — return null.
    expect(result).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC3: Karma scanner
// ─────────────────────────────────────────────────────────────────────────────
describe("E19-S15 AC3: Karma scanner", () => {
  let projectDir;

  beforeEach(() => {
    cleanFixtures();
    projectDir = createFixtureDir("ac3-karma");
  });

  afterEach(() => {
    cleanFixtures();
  });

  it("BTI-21: detects karma.conf.js with browsers array", async () => {
    writeFileSync(
      join(projectDir, "karma.conf.js"),
      `module.exports = function(config) {
  config.set({
    browsers: ['Chrome', 'Firefox'],
  });
};
`
    );

    const result = await detectBrowserMatrix(projectDir);
    expect(result).not.toBeNull();
    expect(result.browser_matrix).toHaveLength(2);
    const names = result.browser_matrix.map((b) => b.name);
    expect(names).toContain("Chrome");
    expect(names).toContain("Firefox");
    expect(result.browser_matrix[0].config_source).toBe("karma.conf.js");
  });

  it("detects karma.conf.ts", async () => {
    writeFileSync(
      join(projectDir, "karma.conf.ts"),
      `export default function (config: any) {
  config.set({
    browsers: ["ChromeHeadless"],
  });
}
`
    );

    const result = await detectBrowserMatrix(projectDir);
    expect(result).not.toBeNull();
    expect(result.browser_matrix).toHaveLength(1);
    expect(result.browser_matrix[0].name).toBe("ChromeHeadless");
    expect(result.browser_matrix[0].config_source).toBe("karma.conf.ts");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC4 + AC6: Browserslist is a BUILD TARGET, not a test browser matrix
// ─────────────────────────────────────────────────────────────────────────────
describe("E19-S15 AC4/AC6: Browserslist as build target (NFR-041)", () => {
  let projectDir;

  beforeEach(() => {
    cleanFixtures();
    projectDir = createFixtureDir("ac4-browserslist");
  });

  afterEach(() => {
    cleanFixtures();
  });

  it("BTI-22: .browserslistrc alone returns build_target_only, browser_matrix null", async () => {
    writeFileSync(join(projectDir, ".browserslistrc"), "> 0.5%, last 2 versions, not dead\n");

    const result = await detectBrowserMatrix(projectDir);
    expect(result).not.toBeNull();
    expect(result.browser_matrix).toBeNull();
    expect(result.build_target_only).not.toBeNull();
    expect(result.build_target_only.type).toBe("build_target_only");
    expect(result.build_target_only.config_source).toBe(".browserslistrc");
  });

  it("package.json browserslist field alone returns build_target_only", async () => {
    writeFileSync(
      join(projectDir, "package.json"),
      JSON.stringify({
        name: "demo",
        browserslist: ["> 0.5%", "last 2 versions"],
      })
    );

    const result = await detectBrowserMatrix(projectDir);
    expect(result).not.toBeNull();
    expect(result.browser_matrix).toBeNull();
    expect(result.build_target_only).not.toBeNull();
    expect(result.build_target_only.type).toBe("build_target_only");
    expect(result.build_target_only.config_source).toBe("package.json[browserslist]");
  });

  it("BTI-24: playwright + browserslist coexist — playwright -> browser_matrix, browserslist -> build_target", async () => {
    writeFileSync(
      join(projectDir, "playwright.config.ts"),
      `export default {
  projects: [
    { name: 'chromium' },
    { name: 'firefox' },
  ],
};
`
    );
    writeFileSync(join(projectDir, ".browserslistrc"), "> 0.5%, last 2 versions\n");

    const result = await detectBrowserMatrix(projectDir);
    expect(result).not.toBeNull();
    expect(result.browser_matrix).toHaveLength(2);
    expect(result.build_target_only).not.toBeNull();
    expect(result.build_target_only.type).toBe("build_target_only");
    expect(result.build_target_only.config_source).toBe(".browserslistrc");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC5: Result shape
// ─────────────────────────────────────────────────────────────────────────────
describe("E19-S15 AC5: result shape", () => {
  let projectDir;

  beforeEach(() => {
    cleanFixtures();
    projectDir = createFixtureDir("ac5-shape");
  });

  afterEach(() => {
    cleanFixtures();
  });

  it("returns browser_matrix entries shaped as { name, config_source }", async () => {
    writeFileSync(
      join(projectDir, "playwright.config.ts"),
      `export default { projects: [{ name: 'chromium' }] };
`
    );

    const result = await detectBrowserMatrix(projectDir);
    expect(result).not.toBeNull();
    expect(result.browser_matrix).toHaveLength(1);
    expect(result.browser_matrix[0]).toEqual({
      name: "chromium",
      config_source: "playwright.config.ts",
    });
  });

  it("BTI-23: returns null when no browser-related files are present", async () => {
    writeFileSync(join(projectDir, "README.md"), "# no browsers here");

    const result = await detectBrowserMatrix(projectDir);
    expect(result).toBeNull();
  });

  it("package.json without browserslist returns null", async () => {
    writeFileSync(join(projectDir, "package.json"), JSON.stringify({ name: "demo" }));

    const result = await detectBrowserMatrix(projectDir);
    expect(result).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Precedence: playwright > cypress > karma
// ─────────────────────────────────────────────────────────────────────────────
describe("E19-S15 scanner precedence", () => {
  let projectDir;

  beforeEach(() => {
    cleanFixtures();
    projectDir = createFixtureDir("precedence");
  });

  afterEach(() => {
    cleanFixtures();
  });

  it("prefers playwright over cypress when both present", async () => {
    writeFileSync(
      join(projectDir, "playwright.config.ts"),
      `export default { projects: [{ name: 'chromium' }] };
`
    );
    writeFileSync(
      join(projectDir, "cypress.config.js"),
      `module.exports = { browsers: ['chrome'] };
`
    );

    const result = await detectBrowserMatrix(projectDir);
    expect(result.browser_matrix[0].config_source).toBe("playwright.config.ts");
  });

  it("prefers cypress over karma when both present", async () => {
    writeFileSync(
      join(projectDir, "cypress.config.js"),
      `module.exports = { browsers: ['chrome'] };
`
    );
    writeFileSync(
      join(projectDir, "karma.conf.js"),
      `module.exports = function(config) { config.set({ browsers: ['Chrome'] }); };
`
    );

    const result = await detectBrowserMatrix(projectDir);
    expect(result.browser_matrix[0].config_source).toBe("cypress.config.js");
  });
});
