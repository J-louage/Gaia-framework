import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";

const PROJECT_ROOT = resolve(import.meta.dirname, "../../..");
const INSTRUCTIONS_XML = join(
  PROJECT_ROOT,
  "_gaia",
  "lifecycle",
  "workflows",
  "4-implementation",
  "create-story",
  "instructions.xml"
);
const EDGE_CASES_SKILL = join(
  PROJECT_ROOT,
  "_gaia",
  "dev",
  "skills",
  "edge-cases.md"
);

function loadFile(path) {
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf-8");
}

describe("E19-S9: Edge Case Mandatory Sub-Step in /gaia-create-story", () => {
  // AC1: After acceptance criteria are drafted, /gaia-create-story invokes the edge case
  // skill (_gaia/dev/skills/edge-cases.md) as a sub-step for M+ stories (FR-227)
  describe("AC1: edge-cases.md skill invoked for M+ stories (FR-227)", () => {
    it("instructions.xml references the edge-cases.md skill path for M+ story sizes", () => {
      const content = loadFile(INSTRUCTIONS_XML);
      expect(content).not.toBeNull();
      // Must explicitly reference the edge-cases skill file
      expect(content).toMatch(/edge-cases\.md/);
    });

    it("instructions.xml invokes edge case analysis only for M+ stories (not for S)", () => {
      const content = loadFile(INSTRUCTIONS_XML);
      expect(content).not.toBeNull();
      // Must include the size check with M/L/XL triggering the sub-step
      expect(content).toMatch(/size.*(?:M|L|XL)|(?:M|L|XL).*size/i);
      // Must explicitly invoke or load the edge-cases skill (not just mention it)
      expect(content).toMatch(/load.*edge.?cases|invoke.*edge.?cases|edge.?cases.*skill|JIT.*edge|edge.*JIT/i);
    });

    it("edge-cases.md skill file exists at _gaia/dev/skills/edge-cases.md", () => {
      // RED: this file does not exist yet — the skill must be created as part of E19-S9
      expect(existsSync(EDGE_CASES_SKILL)).toBe(true);
    });

    it("instructions.xml traces to FR-227", () => {
      const content = loadFile(INSTRUCTIONS_XML);
      expect(content).not.toBeNull();
      expect(content).toMatch(/FR-227/);
    });
  });

  // AC2: Sub-step runs within the existing create-story context — no separate workflow invocation
  describe("AC2: sub-step runs in-context (no separate workflow invocation)", () => {
    it("instructions.xml does NOT use invoke-workflow or invoke-task for edge case analysis", () => {
      const content = loadFile(INSTRUCTIONS_XML);
      expect(content).not.toBeNull();
      // The edge case step must NOT delegate to a separate workflow — it is a JIT skill load
      // Negative: should not have invoke-workflow pointing to edge-cases
      expect(content).not.toMatch(/<invoke-workflow[^>]*edge.?cases/i);
      expect(content).not.toMatch(/<invoke-task[^>]*edge.?cases/i);
    });

    it("edge-cases.md skill is structured as a loadable skill (not a workflow)", () => {
      const content = loadFile(EDGE_CASES_SKILL);
      expect(content).not.toBeNull();
      // Skill files use markdown sections, not workflow.yaml structure
      // Must NOT look like a workflow.yaml file
      expect(content).not.toMatch(/^name:\s+\w/m);
      expect(content).not.toMatch(/^instructions:/m);
    });
  });

  // AC3: Sub-step execution stays within 8K tokens (NFR-042)
  describe("AC3: 8K token budget constraint (NFR-042)", () => {
    it("instructions.xml references the 8K token budget or NFR-042 for edge case sub-step", () => {
      const content = loadFile(INSTRUCTIONS_XML);
      expect(content).not.toBeNull();
      // Must reference the token limit or the NFR requirement
      expect(content).toMatch(/NFR-042|8[Kk]\s*token|8,000\s*token|8000\s*char/i);
    });

    it("edge-cases.md skill file is under 300 lines (skill file size constraint)", () => {
      const content = loadFile(EDGE_CASES_SKILL);
      expect(content).not.toBeNull();
      // Skill files must not exceed 300 lines per GAIA framework constraints
      const lines = content.split("\n").length;
      expect(lines).toBeLessThanOrEqual(300);
    });
  });

  // AC4: Edge case results returned as structured list: { id, scenario, input, expected, category }
  describe("AC4: structured output format { id, scenario, input, expected, category }", () => {
    it("edge-cases.md skill defines the required output fields: id, scenario, input, expected, category", () => {
      const content = loadFile(EDGE_CASES_SKILL);
      expect(content).not.toBeNull();
      // All 5 required fields must be documented in the skill
      expect(content).toMatch(/\bid\b/i);
      expect(content).toMatch(/\bscenario\b/i);
      expect(content).toMatch(/\binput\b/i);
      expect(content).toMatch(/\bexpected\b/i);
      expect(content).toMatch(/\bcategory\b/i);
    });

    it("instructions.xml captures edge case results as a structured list before story output", () => {
      const content = loadFile(INSTRUCTIONS_XML);
      expect(content).not.toBeNull();
      // Must reference the structured output format with at least two field names from
      // { id, scenario, input, expected, category } appearing together in a list/object context
      // A vague reference to edge case analysis is NOT sufficient
      expect(content).toMatch(/(?:id.*scenario.*input|scenario.*input.*expected|input.*expected.*category)/i);
    });
  });

  // AC5: Sub-step completion confirmed before story file written to disk
  describe("AC5: sub-step completes before story file is written", () => {
    it("instructions.xml places edge case sub-step (invocation of edge-cases.md) BEFORE the template-output step", () => {
      const content = loadFile(INSTRUCTIONS_XML);
      expect(content).not.toBeNull();
      // Edge case analysis must appear before the template-output that writes the story file
      // The sub-step invocation must reference the skill file — not just a comment
      const edgeCasePos = content.search(/edge-cases\.md/);
      const templateOutputPos = content.search(/<template-output[^>]*implementation_artifacts/i);
      // edge-cases.md must be found (RED if skill reference is absent)
      expect(edgeCasePos).toBeGreaterThan(-1);
      expect(templateOutputPos).toBeGreaterThan(-1);
      // Edge case step must come BEFORE template-output in the file
      expect(edgeCasePos).toBeLessThan(templateOutputPos);
    });

    it("instructions.xml stores edge case sub-step results in a named variable before story output", () => {
      const content = loadFile(INSTRUCTIONS_XML);
      expect(content).not.toBeNull();
      // Must store results in a variable or action — not merely mention edge cases
      // Matches: edge_case_results, edge-case-results, store edge case, capture edge case results
      expect(content).toMatch(/edge.?case.?results?\s*=|store.*edge.?case|capture.*edge.?case|edge.?case.*stored/i);
    });
  });

  // AC6: If edge case skill fails or times out, story creation continues with a warning
  describe("AC6: skill failure is non-blocking (graceful degradation)", () => {
    it("instructions.xml includes non-blocking guard specifically for the edge case sub-step", () => {
      const content = loadFile(INSTRUCTIONS_XML);
      expect(content).not.toBeNull();
      // Must have explicit non-blocking / warning-on-failure handling scoped to the edge case sub-step
      // A generic non-blocking reference elsewhere in the file is NOT sufficient
      expect(content).toMatch(
        /edge.?case.*(?:non.?blocking|on_error|warn.*continue|fail.*continue|timeout)|(?:edge.?cases\.md).*(?:fail|warn|error)/i
      );
    });

    it("edge-cases.md skill defines its own error/timeout handling section", () => {
      const content = loadFile(EDGE_CASES_SKILL);
      expect(content).not.toBeNull();
      // Skill must document failure/timeout behavior — it is non-blocking
      expect(content).toMatch(/fail|timeout|error|non.?blocking|warning/i);
    });
  });
});
