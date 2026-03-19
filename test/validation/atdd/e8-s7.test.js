import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";

// Project root is where _gaia/ lives (4 levels up: test/validation/atdd/ -> Gaia-framework/ -> GAIA-Framework/)
const PROJECT_ROOT = resolve(import.meta.dirname, "../../../..");
const WORKFLOW_DIR = join(
  PROJECT_ROOT,
  "_gaia",
  "lifecycle",
  "workflows",
  "4-implementation",
  "val-validate-plan",
);

describe("E8-S7: val-validate-plan Workflow", () => {
  // AC1: Required workflow files exist
  describe("AC1: workflow.yaml, instructions.xml, checklist.md exist", () => {
    const requiredFiles = ["workflow.yaml", "instructions.xml", "checklist.md"];

    it.each(requiredFiles)("val-validate-plan/%s exists", (file) => {
      expect(
        existsSync(join(WORKFLOW_DIR, file)),
        `Missing file: val-validate-plan/${file}`,
      ).toBe(true);
    });
  });

  // AC2: Plan validation protocol steps in instructions.xml
  describe("AC2: instructions contain parse, verify targets, verify bumps, verify completeness, cross-reference", () => {
    it("instructions.xml contains all required protocol steps", () => {
      const instrPath = join(WORKFLOW_DIR, "instructions.xml");
      expect(existsSync(instrPath), "instructions.xml must exist").toBe(true);

      const content = readFileSync(instrPath, "utf-8").toLowerCase();

      const requiredSteps = [
        {
          name: "parse plan",
          patterns: ["parse plan", "parse the plan", "load plan"],
        },
        {
          name: "verify file targets",
          patterns: ["file target", "target file", "verify file", "targets exist"],
        },
        {
          name: "verify version bumps",
          patterns: ["version bump", "version change", "bump"],
        },
        {
          name: "verify completeness",
          patterns: ["completeness", "complete", "missing"],
        },
        {
          name: "cross-reference",
          patterns: ["cross-reference", "cross reference", "ground truth"],
        },
      ];

      for (const step of requiredSteps) {
        const found = step.patterns.some((p) => content.includes(p));
        expect(found, `Missing protocol step: ${step.name}`).toBe(true);
      }
    });
  });

  // AC3: Findings output format
  describe("AC3: instructions reference Plan Validation Findings", () => {
    it("instructions.xml references Plan Validation Findings section", () => {
      const instrPath = join(WORKFLOW_DIR, "instructions.xml");
      expect(existsSync(instrPath), "instructions.xml must exist").toBe(true);

      const content = readFileSync(instrPath, "utf-8");
      expect(content).toMatch(/Plan Validation Findings/i);
    });
  });

  // AC4: Manifest entry
  describe("AC4: workflow-manifest.csv contains val-validate-plan", () => {
    it("val-validate-plan is listed in workflow-manifest.csv", () => {
      const manifestPath = join(
        PROJECT_ROOT,
        "_gaia",
        "_config",
        "workflow-manifest.csv",
      );
      expect(existsSync(manifestPath), "workflow-manifest.csv must exist").toBe(
        true,
      );

      const content = readFileSync(manifestPath, "utf-8");
      expect(content).toContain("val-validate-plan");
    });
  });

  // AC8: model_override: opus in workflow.yaml
  describe("AC8: model_override opus enforcement", () => {
    it("workflow.yaml contains model_override: opus", () => {
      const workflowPath = join(WORKFLOW_DIR, "workflow.yaml");
      expect(existsSync(workflowPath), "workflow.yaml must exist").toBe(true);

      const content = readFileSync(workflowPath, "utf-8");
      expect(content).toMatch(/model_override:\s*opus/);
    });
  });
});
