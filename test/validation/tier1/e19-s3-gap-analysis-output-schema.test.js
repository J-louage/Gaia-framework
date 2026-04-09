import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import yaml from "js-yaml";
import { PROJECT_ROOT } from "../../helpers/project-root.js";

const TEMPLATE_PATH = join(
  PROJECT_ROOT,
  "_gaia",
  "lifecycle",
  "templates",
  "test-gap-analysis-template.md"
);

const DOCUMENT_RULESETS_PATH = join(
  PROJECT_ROOT,
  "_gaia",
  "lifecycle",
  "skills",
  "document-rulesets.md"
);

// Canonical enums from the FR-223 schema — keep these in sync with
// test-gap-analysis-template.md and the gap-analysis-output Val ruleset.
const REQUIRED_FRONTMATTER_FIELDS = ["mode", "date", "project", "story_count", "gap_count"];
const GAP_TYPE_ENUM = ["missing-test", "unexecuted", "uncovered-ac", "missing-edge-case"];
const SEVERITY_ENUM = ["critical", "high", "medium", "low"];
const REQUIRED_SECTIONS = [
  /##\s+Executive Summary/,
  /##\s+Gap Table/,
  /##\s+Per-Story Detail/,
  /##\s+Recommendations/,
];
const GAP_TABLE_COLUMNS = ["story_key", "gap_type", "severity", "description"];

/**
 * E19-S3: Gap Analysis Output Schema
 *
 * Validates the standardized schema for test-gap-analysis-{date}.md output,
 * the template file used to scaffold that output, and the Val ruleset
 * that verifies gap analysis output conformance.
 *
 * Traces to: FR-223, ADR-030 §10.22
 * Test cases: TGA-17–20
 */
describe("E19-S3: Gap Analysis Output Schema", () => {
  let content;

  beforeAll(() => {
    if (existsSync(TEMPLATE_PATH)) {
      content = readFileSync(TEMPLATE_PATH, "utf8");
    }
  });

  // --- TGA-17 / AC5: Template file exists and is non-empty ---
  it("template file exists at _gaia/lifecycle/templates/test-gap-analysis-template.md", () => {
    expect(existsSync(TEMPLATE_PATH)).toBe(true);
    expect(content).toBeDefined();
    expect(content.length).toBeGreaterThan(0);
  });

  // --- TGA-18 / AC4: YAML frontmatter parses without error ---
  it("template YAML frontmatter parses cleanly with js-yaml", () => {
    expect(content).toBeDefined();
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    expect(frontmatterMatch).not.toBeNull();
    const frontmatterText = frontmatterMatch[1];
    let parsed;
    expect(() => {
      parsed = yaml.load(frontmatterText);
    }).not.toThrow();
    expect(parsed).toBeTypeOf("object");
  });

  // --- AC1: Required frontmatter fields (mode, date, project, story_count, gap_count) ---
  it("frontmatter declares the 5 required fields: mode, date, project, story_count, gap_count", () => {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    const parsed = yaml.load(frontmatterMatch[1]);
    for (const field of REQUIRED_FRONTMATTER_FIELDS) {
      expect(parsed).toHaveProperty(field);
    }
  });

  // --- AC1: Schema mandates five sections ---
  it("template contains all required schema sections", () => {
    for (const pattern of REQUIRED_SECTIONS) {
      expect(content).toMatch(pattern);
    }
  });

  // --- AC1: Gap Table must declare four columns ---
  it("Gap Table documents the four canonical columns", () => {
    const gapTableSection = content.split(/##\s+Gap Table/)[1].split(/##\s+/)[0];
    for (const column of GAP_TABLE_COLUMNS) {
      expect(gapTableSection).toContain(column);
    }
  });

  // --- TGA-19 / AC2: Gap type enum is fixed and closed ---
  it("documents the fixed gap_type enum: missing-test, unexecuted, uncovered-ac, missing-edge-case", () => {
    for (const val of GAP_TYPE_ENUM) {
      expect(content).toContain(val);
    }
  });

  // --- TGA-20 / AC3: Severity enum is fixed ---
  it("documents the fixed severity enum: critical, high, medium, low", () => {
    for (const val of SEVERITY_ENUM) {
      expect(content).toContain(val);
    }
  });

  // --- AC2: Gap type enum is explicitly called out as closed ---
  it("documents that the gap_type enum is closed (no extension without schema version bump)", () => {
    expect(content).toMatch(/closed|fixed/i);
    expect(content).toMatch(/schema version/i);
  });

  // --- AC6: Val document-rulesets skill declares the gap-analysis ruleset ---
  it("document-rulesets.md declares a gap-analysis-rules section", () => {
    expect(existsSync(DOCUMENT_RULESETS_PATH)).toBe(true);
    const rulesetsContent = readFileSync(DOCUMENT_RULESETS_PATH, "utf8");
    // Section marker must exist so Val can JIT-load the ruleset
    expect(rulesetsContent).toMatch(/<!--\s*SECTION:\s*gap-analysis-rules\s*-->/);
    // Frontmatter sections list must include gap-analysis-rules
    expect(rulesetsContent).toMatch(/sections:\s*\[[^\]]*gap-analysis-rules/);
    // Path-to-ruleset mapping table entry must exist
    expect(rulesetsContent).toMatch(/test-gap-analysis-\*\.md.*gap-analysis-rules/);
    // Ruleset must enumerate every gap_type enum value
    for (const val of GAP_TYPE_ENUM) {
      expect(rulesetsContent).toContain(val);
    }
  });

  // --- AC6: Val ruleset enumerates severity enum and required frontmatter ---
  it("gap-analysis-rules ruleset enumerates required frontmatter fields and severity enum", () => {
    const rulesetsContent = readFileSync(DOCUMENT_RULESETS_PATH, "utf8");
    for (const field of REQUIRED_FRONTMATTER_FIELDS) {
      expect(rulesetsContent).toContain(field);
    }
    for (const val of SEVERITY_ENUM) {
      expect(rulesetsContent).toContain(val);
    }
  });
});
