/**
 * E19-S22 — Project Type Detection Unit Tests
 *
 * Tests the detectProjectType function from project-type-detection.js
 * using fixture directories representing each project type.
 *
 * Test coverage:
 *   - Frontend (React app with package.json, src/, public/)
 *   - Backend (Express with package.json)
 *   - Fullstack (both frontend + backend signals)
 *   - Data (requirements.txt with pandas, .ipynb files)
 *   - Mobile (Flutter with pubspec.yaml, ios/, android/)
 *   - Unknown (empty directory)
 *   - Missing path (nonexistent directory — no throw)
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { detectProjectType } from "../project-type-detection.js";

const TEST_ROOT = join(tmpdir(), "gaia-ptd-test-" + Date.now());

function createFixture(name, setup) {
  const dir = join(TEST_ROOT, name);
  mkdirSync(dir, { recursive: true });
  setup(dir);
  return dir;
}

let fixtures = {};

beforeAll(() => {
  mkdirSync(TEST_ROOT, { recursive: true });

  // Frontend fixture — React app
  fixtures.frontend = createFixture("frontend", (dir) => {
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({
        dependencies: { react: "^18.0.0", "react-dom": "^18.0.0" },
      }),
    );
    mkdirSync(join(dir, "src"), { recursive: true });
    mkdirSync(join(dir, "public"), { recursive: true });
    writeFileSync(join(dir, "index.html"), "<html></html>");
  });

  // Backend fixture — Express
  fixtures.backend = createFixture("backend", (dir) => {
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({
        dependencies: { express: "^4.18.0" },
      }),
    );
    writeFileSync(join(dir, "server.js"), "const express = require('express');");
  });

  // Fullstack fixture — React + Express
  fixtures.fullstack = createFixture("fullstack", (dir) => {
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({
        dependencies: {
          react: "^18.0.0",
          "react-dom": "^18.0.0",
          express: "^4.18.0",
        },
      }),
    );
    mkdirSync(join(dir, "src"), { recursive: true });
    mkdirSync(join(dir, "public"), { recursive: true });
    writeFileSync(join(dir, "index.html"), "<html></html>");
  });

  // Data fixture — Python data project
  fixtures.data = createFixture("data", (dir) => {
    writeFileSync(join(dir, "requirements.txt"), "pandas==2.0.0\nnumpy==1.24.0\n");
    writeFileSync(join(dir, "analysis.ipynb"), "{}");
    mkdirSync(join(dir, "notebooks"), { recursive: true });
  });

  // Mobile fixture — Flutter
  fixtures.mobile = createFixture("mobile", (dir) => {
    writeFileSync(join(dir, "pubspec.yaml"), "name: my_app\nflutter:\n  sdk: flutter\n");
    mkdirSync(join(dir, "ios"), { recursive: true });
    mkdirSync(join(dir, "android"), { recursive: true });
  });

  // Unknown fixture — empty directory
  fixtures.unknown = createFixture("unknown", () => {});

  // Backend — Python Django
  fixtures.backendPython = createFixture("backend-python", (dir) => {
    writeFileSync(join(dir, "requirements.txt"), "django==4.2.0\ncelery==5.3.0\n");
  });

  // Backend — Java Maven
  fixtures.backendJava = createFixture("backend-java", (dir) => {
    writeFileSync(join(dir, "pom.xml"), "<project></project>");
  });

  // Backend — Go
  fixtures.backendGo = createFixture("backend-go", (dir) => {
    writeFileSync(join(dir, "go.mod"), "module example.com/myapp\ngo 1.21\n");
  });

  // Frontend — Angular
  fixtures.frontendAngular = createFixture("frontend-angular", (dir) => {
    writeFileSync(join(dir, "angular.json"), "{}");
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({
        dependencies: { "@angular/core": "^17.0.0" },
      }),
    );
  });

  // Mobile — React Native
  fixtures.mobileRN = createFixture("mobile-rn", (dir) => {
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({
        dependencies: { "react-native": "^0.73.0" },
      }),
    );
    mkdirSync(join(dir, "ios"), { recursive: true });
    mkdirSync(join(dir, "android"), { recursive: true });
  });
});

afterAll(() => {
  if (existsSync(TEST_ROOT)) {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  }
});

// ─── Core type detection tests ───────────────────────────────────────────────

describe("detectProjectType", () => {
  it("detects frontend project (React)", () => {
    const result = detectProjectType(fixtures.frontend);
    expect(result.type).toBe("frontend");
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.evidence.some((e) => e.includes("react"))).toBe(true);
  });

  it("detects backend project (Express)", () => {
    const result = detectProjectType(fixtures.backend);
    expect(result.type).toBe("backend");
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.evidence.some((e) => e.includes("express"))).toBe(true);
  });

  it("detects fullstack project (React + Express)", () => {
    const result = detectProjectType(fixtures.fullstack);
    expect(result.type).toBe("fullstack");
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.evidence.some((e) => e.includes("react"))).toBe(true);
    expect(result.evidence.some((e) => e.includes("express"))).toBe(true);
  });

  it("detects data project (pandas + notebooks)", () => {
    const result = detectProjectType(fixtures.data);
    expect(result.type).toBe("data");
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.evidence.some((e) => e.includes("pandas"))).toBe(true);
  });

  it("detects mobile project (Flutter)", () => {
    const result = detectProjectType(fixtures.mobile);
    expect(result.type).toBe("mobile");
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.evidence.some((e) => e.includes("pubspec.yaml"))).toBe(true);
  });

  it("returns unknown for empty directory", () => {
    const result = detectProjectType(fixtures.unknown);
    expect(result.type).toBe("unknown");
    expect(result.evidence).toEqual([]);
  });

  it("returns unknown for nonexistent path (no throw)", () => {
    const result = detectProjectType("/nonexistent/path/that/does/not/exist");
    expect(result.type).toBe("unknown");
    expect(result.evidence).toEqual([]);
  });

  it("returns unknown for null input (no throw)", () => {
    const result = detectProjectType(null);
    expect(result.type).toBe("unknown");
    expect(result.evidence).toEqual([]);
  });

  it("returns unknown for undefined input (no throw)", () => {
    const result = detectProjectType(undefined);
    expect(result.type).toBe("unknown");
    expect(result.evidence).toEqual([]);
  });
});

// ─── Additional backend variants ─────────────────────────────────────────────

describe("detectProjectType — backend variants", () => {
  it("detects Python Django backend", () => {
    const result = detectProjectType(fixtures.backendPython);
    expect(result.type).toBe("backend");
    expect(result.evidence.some((e) => e.includes("django"))).toBe(true);
  });

  it("detects Java Maven backend", () => {
    const result = detectProjectType(fixtures.backendJava);
    expect(result.type).toBe("backend");
    expect(result.evidence.some((e) => e.includes("pom.xml"))).toBe(true);
  });

  it("detects Go backend", () => {
    const result = detectProjectType(fixtures.backendGo);
    expect(result.type).toBe("backend");
    expect(result.evidence.some((e) => e.includes("go.mod"))).toBe(true);
  });
});

// ─── Additional frontend variants ────────────────────────────────────────────

describe("detectProjectType — frontend variants", () => {
  it("detects Angular project via angular.json", () => {
    const result = detectProjectType(fixtures.frontendAngular);
    expect(result.type).toBe("frontend");
    expect(result.evidence.some((e) => e.includes("angular"))).toBe(true);
  });
});

// ─── Additional mobile variants ──────────────────────────────────────────────

describe("detectProjectType — mobile variants", () => {
  it("detects React Native project", () => {
    const result = detectProjectType(fixtures.mobileRN);
    expect(result.type).toBe("mobile");
    expect(result.evidence.some((e) => e.includes("react-native"))).toBe(true);
  });
});

// ─── Return shape validation ─────────────────────────────────────────────────

describe("detectProjectType — return shape", () => {
  const VALID_TYPES = ["frontend", "backend", "fullstack", "data", "mobile", "unknown"];

  it("always returns an object with type and evidence", () => {
    for (const fixtureName of Object.keys(fixtures)) {
      const result = detectProjectType(fixtures[fixtureName]);
      expect(result).toHaveProperty("type");
      expect(result).toHaveProperty("evidence");
      expect(VALID_TYPES).toContain(result.type);
      expect(Array.isArray(result.evidence)).toBe(true);
    }
  });

  it("evidence contains only strings", () => {
    for (const fixtureName of Object.keys(fixtures)) {
      const result = detectProjectType(fixtures[fixtureName]);
      for (const item of result.evidence) {
        expect(typeof item).toBe("string");
      }
    }
  });
});
