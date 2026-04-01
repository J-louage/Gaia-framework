import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const PROJECT_ROOT = resolve(import.meta.dirname, "../../..");

describe("E10-S14: Workflow Engine Template Resolution from custom/templates/", () => {
  const workflowXml = readFileSync(resolve(PROJECT_ROOT, "_gaia/core/engine/workflow.xml"), "utf8");

  const createStoryXml = readFileSync(
    resolve(
      PROJECT_ROOT,
      "_gaia/lifecycle/workflows/4-implementation/create-story/instructions.xml"
    ),
    "utf8"
  );

  // ── AC1: Engine resolves template from custom/templates/ before framework default ──
  describe("AC1: Custom template resolution precedence", () => {
    it("workflow.xml Step 1 contains template resolution logic checking custom/templates/", () => {
      expect(workflowXml).toContain("custom/templates/");
    });

    it("workflow.xml Step 1 checks custom path before falling back to framework default", () => {
      // The resolution must mention checking custom/templates/ and falling back
      expect(workflowXml).toMatch(/custom\/templates\/.*fall\s*back/is);
    });
  });

  // ── AC2: create-story uses engine-resolved template path ──
  describe("AC2: create-story uses resolved template path", () => {
    it("create-story Step 6 does NOT hardcode the framework template path as sole source", () => {
      // Step 6 should NOT contain ONLY a hardcoded read from _gaia/lifecycle/templates/story-template.md
      // It should reference the engine-resolved path or mention custom/templates/ fallback
      const step6Match = createStoryXml.match(/<step n="6"[\s\S]*?<\/step>/);
      expect(step6Match).not.toBeNull();
      const step6Content = step6Match[0];

      // The first action in Step 6 should NOT be solely a hardcoded framework path
      // without any mention of engine resolution or custom templates
      const hasOnlyHardcoded =
        step6Content.includes(
          "Read the story template from {project-root}/_gaia/lifecycle/templates/story-template.md</action>"
        ) &&
        !step6Content.includes("engine-resolved") &&
        !step6Content.includes("custom/templates/");
      expect(
        hasOnlyHardcoded,
        "Step 6 should reference engine-resolved template path, not hardcoded framework path alone"
      ).toBe(false);
    });

    it("create-story Step 6 references engine-resolved template path", () => {
      const step6Match = createStoryXml.match(/<step n="6"[\s\S]*?<\/step>/);
      expect(step6Match).not.toBeNull();
      const step6Content = step6Match[0];

      // Step 6 should mention that the engine resolves the template path
      expect(step6Content).toMatch(/engine-resolved|resolved template path|custom\/templates\//i);
    });
  });

  // ── AC3: Custom template fully replaces framework default (no merge) ──
  describe("AC3: Full replacement, no merge", () => {
    it("workflow.xml Step 1 states custom template replaces framework default without merging", () => {
      const step1Match = workflowXml.match(/<step n="1"[\s\S]*?<\/step>/);
      expect(step1Match).not.toBeNull();
      const step1Content = step1Match[0];

      // Must mention override/replace in the context of custom templates, within Step 1
      expect(step1Content).toMatch(/custom.*(?:replaces|override|full precedence|instead of)/is);
    });
  });

  // ── AC4: Silent fallback when custom/templates/ is missing ──
  describe("AC4: Silent fallback on missing custom directory or file", () => {
    it("workflow.xml Step 1 specifies no error or warning on template fallback", () => {
      const step1Match = workflowXml.match(/<step n="1"[\s\S]*?<\/step>/);
      expect(step1Match).not.toBeNull();
      const step1Content = step1Match[0];

      // The no-error/no-warning clause must be in the template resolution context in Step 1
      expect(step1Content).toMatch(
        /[Nn]o error.*[Nn]o warning|silent.*fallback|no warning.*no error/i
      );
    });
  });

  // ── AC5: Resolution logic documented in workflow.xml as reusable engine action ──
  describe("AC5: Documented as reusable engine action", () => {
    it("workflow.xml contains template resolution as a named/documented action in Step 1", () => {
      // Should be in Step 1 with inline documentation
      const step1Match = workflowXml.match(/<step n="1"[\s\S]*?<\/step>/);
      expect(step1Match).not.toBeNull();
      const step1Content = step1Match[0];

      expect(step1Content).toContain("custom/templates/");
    });

    it("workflow.xml includes a comment explaining template resolution precedence", () => {
      // Should have a comment block explaining the resolution order
      expect(workflowXml).toMatch(/<!--.*[Tt]emplate [Rr]esolution.*-->/s);
    });
  });

  // ── AC6: Write-path enforcement — templates written only to custom/templates/ ──
  describe("AC6: Write-path enforcement", () => {
    it("workflow.xml contains a mandate that template writes go to custom/templates/", () => {
      expect(workflowXml).toMatch(
        /[Tt]emplate.*writ.*custom\/templates\/|writ.*template.*custom\/templates\//is
      );
    });

    it("workflow.xml states templates must NEVER be written to _gaia/lifecycle/templates/", () => {
      expect(workflowXml).toMatch(
        /NEVER.*writ.*_gaia\/lifecycle\/templates|must not.*writ.*_gaia\/lifecycle\/templates/is
      );
    });
  });

  // ── AC7: Empty custom template (0 bytes) falls back to framework default ──
  describe("AC7: Empty custom template fallback", () => {
    it("workflow.xml Step 1 template resolution handles 0-byte files by falling back", () => {
      const step1Match = workflowXml.match(/<step n="1"[\s\S]*?<\/step>/);
      expect(step1Match).not.toBeNull();
      const step1Content = step1Match[0];

      // The 0-byte / empty / non-empty check must be in Step 1 template resolution context
      expect(step1Content).toMatch(/0 bytes|empty.*skip|non-empty|empty.*fall\s*back/i);
    });
  });

  // ── Structural: template resolution is in Step 1 (Load and Resolve Config) ──
  describe("Structural: Resolution placement", () => {
    it("template resolution logic is placed in Step 1 after variable resolution", () => {
      const step1Match = workflowXml.match(/<step n="1"[\s\S]*?<\/step>/);
      expect(step1Match).not.toBeNull();
      const step1Content = step1Match[0];

      // Template resolution should appear AFTER the variable resolution actions
      const varResolutionPos = step1Content.indexOf(
        "Ask user for any remaining unresolved variables"
      );
      const templateResolutionPos = step1Content.indexOf("custom/templates/");
      expect(varResolutionPos).toBeGreaterThan(-1);
      expect(templateResolutionPos).toBeGreaterThan(-1);
      // Template resolution should come after variable resolution
      expect(templateResolutionPos).toBeGreaterThan(varResolutionPos);
    });
  });

  // ── Structural: template field extraction ──
  describe("Structural: Template filename extraction", () => {
    it("workflow.xml describes extracting the template filename from the resolved path", () => {
      expect(workflowXml).toMatch(/extract.*template.*filename|template.*filename.*extract/is);
    });
  });
});
