import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { PROJECT_ROOT } from "../../helpers/project-root.js";

const TEMPLATE_PATH = join(
  PROJECT_ROOT,
  "_gaia",
  "lifecycle",
  "templates",
  "test-gap-analysis-template.md"
);

const WORKFLOW_INSTRUCTIONS_PATH = join(
  PROJECT_ROOT,
  "_gaia",
  "testing",
  "workflows",
  "test-gap-analysis",
  "instructions.xml"
);

// The six architectural dimensions per FR-224 and architecture §10.22.3.
// These are test-type categories, not behavioral domains.
const ARCHITECTURAL_DIMENSIONS = [
  "Unit Tests",
  "E2E Tests",
  "Cross-browser",
  "Accessibility",
  "Visual Regression",
  "Responsive",
];

// Detection signals drawn from architecture.md §10.22.3 table (lines 3858-3865).
// The template's "Detection signals" callout must reference each of these.
const DETECTION_SIGNALS = [
  "axe-core", // Accessibility
  "Percy", // Visual Regression
  "playwright.config", // Cross-browser
  "viewport", // Responsive
];

// Required columns in the Frontend Dimensions table (AC3).
const REQUIRED_COLUMNS = ["Dimension", "Gap Count", "Coverage Score", "Top-3 Uncovered"];

/**
 * E19-S5: Frontend-Specific Six-Dimension Gap Breakdown
 *
 * Validates that the test-gap-analysis template emits an optional
 * "Frontend Dimensions" section covering the six architectural test-type
 * dimensions when the scanned project is detected as frontend, and that
 * the workflow instructions declare a conditional step that populates the
 * section only for frontend projects (AC1, AC2, AC3, AC4, AC5).
 *
 * Traces to: FR-224, ADR-030 §10.22.3
 * Test cases: TGA-19..23 (§11.26.5 — frontend-specific gap analysis)
 */
/**
 * Extract the "## Frontend Dimensions" section body from the template content.
 * Returns the text between "## Frontend Dimensions" and the next "##" heading.
 * Returns undefined if the section is missing — callers should assert first.
 */
function extractFrontendDimensionsSection(content) {
  if (!content) return undefined;
  const afterHeading = content.split(/##\s+Frontend Dimensions/)[1];
  if (afterHeading === undefined) return undefined;
  return afterHeading.split(/\n##\s+/)[0];
}

describe("E19-S5: Frontend-Specific Six-Dimension Gap Breakdown", () => {
  let templateContent;
  let instructionsContent;
  let frontendSection;

  beforeAll(() => {
    if (existsSync(TEMPLATE_PATH)) {
      templateContent = readFileSync(TEMPLATE_PATH, "utf8");
    }
    if (existsSync(WORKFLOW_INSTRUCTIONS_PATH)) {
      instructionsContent = readFileSync(WORKFLOW_INSTRUCTIONS_PATH, "utf8");
    }
    frontendSection = extractFrontendDimensionsSection(templateContent);
  });

  // --- AC1: Template contains the Frontend Dimensions section ---
  it("template contains a Frontend Dimensions section heading", () => {
    expect(templateContent).toBeDefined();
    expect(templateContent).toMatch(/##\s+Frontend Dimensions/);
  });

  // --- AC2: All six architectural dimensions present in the template ---
  it("template lists all six architectural dimensions (Unit, E2E, Cross-browser, a11y, Visual Regression, Responsive)", () => {
    expect(frontendSection).toBeDefined();
    for (const dimension of ARCHITECTURAL_DIMENSIONS) {
      expect(frontendSection).toContain(dimension);
    }
  });

  // --- AC2: Template references the architectural source of truth ---
  it("template references FR-224 and architecture §10.22.3 as the dimension source", () => {
    expect(frontendSection).toBeDefined();
    expect(frontendSection).toMatch(/FR-224/);
    expect(frontendSection).toMatch(/§?10\.22\.3|ADR-030/);
  });

  // --- AC3: Table has the four required columns ---
  it("Frontend Dimensions table documents the four required columns", () => {
    expect(frontendSection).toBeDefined();
    for (const column of REQUIRED_COLUMNS) {
      expect(frontendSection).toContain(column);
    }
  });

  // --- AC3: Detection signals are documented per §10.22.3 ---
  it("template documents the §10.22.3 detection signals (axe-core, Percy, playwright config, viewport)", () => {
    expect(frontendSection).toBeDefined();
    for (const signal of DETECTION_SIGNALS) {
      expect(frontendSection).toContain(signal);
    }
  });

  // --- AC4: Template explicitly connects to E19-S6 coverage aggregation ---
  it("template notes that per-dimension scores feed into E19-S6 overall coverage", () => {
    expect(frontendSection).toBeDefined();
    // Accepts "E19-S6" or "overall coverage" phrasing
    expect(frontendSection).toMatch(/E19-S6|overall coverage/i);
  });

  // --- AC5: Template declares the conditional-omission rule ---
  it("template declares that the section is omitted for non-frontend projects with no error", () => {
    expect(frontendSection).toBeDefined();
    // Must explicitly call out the conditional behavior
    expect(frontendSection).toMatch(/omit|skip|only when|present only/i);
    expect(frontendSection).toMatch(/non-frontend|not\s+(a\s+)?frontend|frontend.+(only|when)/i);
  });

  // --- AC1: Workflow instructions declare a step for the frontend analysis ---
  it("workflow instructions.xml contains a step 4b (or equivalent) for Frontend Dimensions Analysis", () => {
    expect(instructionsContent).toBeDefined();
    // Allow either explicit "4b" numbering or a renumbered step that titles the work
    expect(instructionsContent).toMatch(/<step[^>]*n="4b"|Frontend Dimensions Analysis/);
  });

  // --- AC1, AC5: The step is gated on an is_frontend flag ---
  it("workflow step gates its behavior on an is_frontend flag", () => {
    expect(instructionsContent).toBeDefined();
    expect(instructionsContent).toContain("is_frontend");
  });

  // --- AC5: The step declares a non-frontend skip branch ---
  it("workflow step has an explicit non-frontend skip branch", () => {
    expect(instructionsContent).toBeDefined();
    // Must have a conditional action for the false branch
    expect(instructionsContent).toMatch(/is_frontend\s*==\s*false|Skip this step|Do NOT emit/);
  });

  // --- AC1: Detection markers are enumerated in the instructions ---
  it("workflow step enumerates frontend detection markers (angular.json, flutter, component.ts, src/app/, package.json)", () => {
    expect(instructionsContent).toBeDefined();
    // Spot-check at least 3 of the 5 markers to allow flexible wording
    const markers = [/angular\.json/, /flutter/i, /\.component\.ts/, /src\/app/, /package\.json/];
    const matches = markers.filter((rx) => rx.test(instructionsContent)).length;
    expect(matches).toBeGreaterThanOrEqual(3);
  });
});
