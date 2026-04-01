import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { PROJECT_ROOT } from "../../helpers/project-root.js";

const GAIA_DIR = join(PROJECT_ROOT, "_gaia");
const BROWNFIELD_INSTRUCTIONS = join(
  GAIA_DIR,
  "lifecycle",
  "workflows",
  "anytime",
  "brownfield-onboarding",
  "instructions.xml"
);

/**
 * Extract content for a specific step from the instructions XML.
 * Handles both integer and decimal step numbers (e.g., "5" or "5.5").
 */
function extractStep(xmlContent, stepNumber) {
  const escaped = stepNumber.replace(".", "\\.");
  const regex = new RegExp(`<step\\s+n="${escaped}"[^>]*>([\\s\\S]*?)</step>`, "i");
  const match = xmlContent.match(regex);
  return match ? match[1] : "";
}

describe("E11-S11: Code-Verified Review", () => {
  const instructions = readFileSync(BROWNFIELD_INSTRUCTIONS, "utf-8");
  const step55 = extractStep(instructions, "5.5");
  const step55Lower = step55.toLowerCase();

  // AC1: Step 5.5 exists in brownfield workflow at correct position
  describe("AC1: Workflow integration — Step 5.5 placement", () => {
    it("brownfield instructions.xml contains Step 5.5", () => {
      expect(instructions).toContain('n="5.5"');
    });

    it("Step 5.5 has title containing code-verified or verification", () => {
      const stepMatch = instructions.match(/<step\s+n="5\.5"\s+title="([^"]+)"/);
      expect(stepMatch).not.toBeNull();
      expect(stepMatch[1].toLowerCase()).toMatch(/code.verif|verif.*review/);
    });

    it("Step 5.5 appears after Step 5 and before Step 6", () => {
      const step5Pos = instructions.indexOf('n="5"');
      const step55Pos = instructions.indexOf('n="5.5"');
      const step6Pos = instructions.indexOf('n="6"');
      expect(step5Pos).toBeGreaterThan(-1);
      expect(step55Pos).toBeGreaterThan(step5Pos);
      expect(step55Pos).toBeLessThan(step6Pos);
    });

    it("Step 5.5 receives consolidated-gaps.md as input", () => {
      expect(step55).toContain("consolidated-gaps.md");
    });

    it("Step 5.5 receives {project-path} as context variable", () => {
      expect(step55).toContain("{project-path}");
    });
  });

  // AC2: Claim extraction from gap entries
  describe("AC2: Claim extraction logic", () => {
    it("Step 5.5 extracts file existence claims (evidence_file)", () => {
      expect(step55).toContain("evidence_file");
      expect(step55Lower).toMatch(/file.*exist|exist.*file/);
    });

    it("Step 5.5 extracts line range claims (evidence_line)", () => {
      expect(step55).toContain("evidence_line");
      expect(step55Lower).toMatch(/line.*range|line.*valid|evidence_line/);
    });

    it("Step 5.5 extracts pattern/string presence claims", () => {
      expect(step55Lower).toMatch(/pattern.*presence|pattern.*search|grep/);
    });

    it("Step 5.5 extracts config key existence claims", () => {
      expect(step55Lower).toMatch(/config.*key|configuration/);
    });
  });

  // AC3: Codebase verification using grep/glob/read
  describe("AC3: Codebase verification engine", () => {
    it("Step 5.5 verifies claims against {project-path}", () => {
      expect(step55).toContain("{project-path}");
      expect(step55Lower).toMatch(/verif|check|confirm/);
    });

    it("Step 5.5 uses grep/glob/read for verification (not shell)", () => {
      expect(step55Lower).toMatch(/grep|glob|read/);
    });
  });

  // AC4: Tristate classification
  describe("AC4: Tristate classification", () => {
    it("Step 5.5 classifies gaps as verified", () => {
      expect(step55Lower).toContain("verified");
    });

    it("Step 5.5 classifies gaps as unverifiable", () => {
      expect(step55Lower).toContain("unverifiable");
    });

    it("Step 5.5 classifies gaps as contradicted", () => {
      expect(step55Lower).toContain("contradicted");
    });
  });

  // AC5: Contradicted claims handling
  describe("AC5: Contradicted claim handling", () => {
    it("Step 5.5 downgrades confidence for contradicted gaps", () => {
      expect(step55Lower).toMatch(/downgrad.*confiden|confiden.*downgrad/);
    });

    it("Step 5.5 attaches reason string to contradicted gaps", () => {
      expect(step55Lower).toMatch(/reason/);
    });

    it("Step 5.5 generates new gap entries from contradicted claims", () => {
      expect(step55Lower).toMatch(/new.*gap.*entr|generat.*gap/);
    });

    it("Step 5.5 sets verified_by to code-verified", () => {
      expect(step55).toContain("verified_by");
      expect(step55).toMatch(/code-verified/);
    });
  });

  // AC6: Output — update consolidated-gaps.md with verification fields
  describe("AC6: Output and write-back", () => {
    it("Step 5.5 adds verification_status field to gap entries", () => {
      expect(step55).toContain("verification_status");
    });

    it("Step 5.5 adds verified_by field to gap entries", () => {
      expect(step55).toContain("verified_by");
    });

    it("Step 5.5 preserves existing fields in gap entries", () => {
      expect(step55Lower).toMatch(/preserv|existing.*field|original/);
    });
  });

  // AC7: Summary generation
  describe("AC7: Verification summary", () => {
    it("Step 5.5 generates summary with total gaps processed", () => {
      expect(step55Lower).toMatch(/total.*gap|gap.*total|summary/);
    });

    it("Step 5.5 reports verified count", () => {
      expect(step55Lower).toContain("verified");
    });

    it("Step 5.5 reports unverifiable count", () => {
      expect(step55Lower).toContain("unverifiable");
    });

    it("Step 5.5 reports contradicted count", () => {
      expect(step55Lower).toContain("contradicted");
    });

    it("Step 5.5 reports new gap entries count", () => {
      expect(step55Lower).toMatch(/new.*entr|new.*gap/);
    });
  });

  // AC8: Missing file reference handling
  describe("AC8: Missing file reference", () => {
    it("Step 5.5 handles files that do not exist", () => {
      expect(step55Lower).toMatch(/not found|does not exist|missing.*file|file.*not.*exist/);
    });

    it("Step 5.5 classifies missing file refs as contradicted", () => {
      expect(step55Lower).toMatch(/missing|not found/);
      expect(step55Lower).toContain("contradicted");
    });
  });

  // AC9: Out-of-bounds line reference handling
  describe("AC9: Out-of-bounds line reference", () => {
    it("Step 5.5 validates line numbers against file length", () => {
      expect(step55Lower).toMatch(
        /line.*exceed|line.*bound|out.of.bound|beyond.*file|file.*length/
      );
    });
  });

  // AC10: Empty input handling
  describe("AC10: Empty input handling", () => {
    it("Step 5.5 handles empty consolidated-gaps.md gracefully", () => {
      expect(step55Lower).toMatch(/empty|zero.*gap|0 gap|no.*gap/);
    });

    it("Step 5.5 produces summary without error on empty input", () => {
      expect(step55Lower).toMatch(/without.*error|no.*error|graceful/);
    });
  });

  // Additional edge cases
  describe("Edge cases", () => {
    it("Step 5.5 handles binary files", () => {
      expect(step55Lower).toMatch(/binary/);
    });

    it("Step 5.5 handles malformed gap entries", () => {
      expect(step55Lower).toMatch(/malform|invalid|missing.*field/);
    });
  });

  // Data flow — contradicted claims feedback to Step 4
  describe("Data flow: Step 4 feedback loop", () => {
    it("Step 5.5 feeds contradicted claims back for PRD correction", () => {
      expect(step55Lower).toMatch(/prd.*correct|feedback|back.*step 4|step 4/i);
    });
  });

  // Step 4 integration — reads verification results
  describe("Step 4 integration", () => {
    it("Step 4 or nearby references code-verified review output", () => {
      const step4 = extractStep(instructions, "4");
      const step5 = extractStep(instructions, "5");
      const combined = step4 + step5;
      // Step 4 should reference consolidated-gaps.md (which is updated by 5.5)
      expect(combined.toLowerCase()).toMatch(/consolidated-gaps|verification|code.verif/);
    });
  });
});
