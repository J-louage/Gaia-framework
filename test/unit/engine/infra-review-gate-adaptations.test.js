import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const PROJECT_ROOT = resolve(import.meta.dirname, "../../..");

const REVIEW_GATE_CHECK_PATH = `${PROJECT_ROOT}/_gaia/core/protocols/review-gate-check.xml`;

describe("E12-S8: Infra Review Gate Adaptations", () => {
  // ── AC1: Infra review gate substitutions ──
  describe("AC1: Infra review gate substitutions are defined", () => {
    it("review-gate-check protocol file exists", () => {
      expect(
        existsSync(REVIEW_GATE_CHECK_PATH),
        `Protocol file not found at ${REVIEW_GATE_CHECK_PATH}`
      ).toBe(true);
    });

    it("defines QA Tests → Policy-as-Code Validation substitution", () => {
      const content = readFileSync(REVIEW_GATE_CHECK_PATH, "utf8");
      expect(content).toContain("Policy-as-Code Validation");
    });

    it("defines Test Automation → Plan Validation + Drift Checks substitution", () => {
      const content = readFileSync(REVIEW_GATE_CHECK_PATH, "utf8");
      expect(content).toContain("Plan Validation");
      expect(content).toContain("Drift Checks");
    });

    it("defines Performance Review → Cost Review + Scaling Validation substitution", () => {
      const content = readFileSync(REVIEW_GATE_CHECK_PATH, "utf8");
      expect(content).toContain("Cost Review");
      expect(content).toContain("Scaling Validation");
    });

    it("defines Test Review → Policy Review substitution", () => {
      const content = readFileSync(REVIEW_GATE_CHECK_PATH, "utf8");
      // Must have "Policy Review" as an infra gate name (distinct from standard "Test Review")
      expect(content).toMatch(/Policy Review/);
    });

    it("specifies Code Review remains unchanged for infra stories", () => {
      const content = readFileSync(REVIEW_GATE_CHECK_PATH, "utf8");
      // Protocol must document that Code Review is unchanged
      expect(content).toMatch(/Code Review.*unchanged|unchanged.*Code Review/is);
    });

    it("specifies Security Review remains unchanged for infra stories", () => {
      const content = readFileSync(REVIEW_GATE_CHECK_PATH, "utf8");
      // Protocol must document that Security Review is unchanged
      expect(content).toMatch(/Security Review.*unchanged|unchanged.*Security Review/is);
    });
  });

  // ── AC2: ID-prefix-based gate selection in review-gate-check ──
  describe("AC2: Review gate protocol reads requirement ID prefix", () => {
    it("reads traces_to field from story file", () => {
      const content = readFileSync(REVIEW_GATE_CHECK_PATH, "utf8");
      expect(content).toContain("traces_to");
    });

    it("detects IR-### prefix for infra gates", () => {
      const content = readFileSync(REVIEW_GATE_CHECK_PATH, "utf8");
      expect(content).toMatch(/IR-/);
    });

    it("detects OR-### prefix for infra gates", () => {
      const content = readFileSync(REVIEW_GATE_CHECK_PATH, "utf8");
      expect(content).toMatch(/OR-/);
    });

    it("detects SR-### prefix for infra gates", () => {
      const content = readFileSync(REVIEW_GATE_CHECK_PATH, "utf8");
      expect(content).toMatch(/SR-/);
    });

    it("uses standard gates for FR-### and NFR-### prefixes", () => {
      const content = readFileSync(REVIEW_GATE_CHECK_PATH, "utf8");
      expect(content).toMatch(/FR-/);
      expect(content).toMatch(/NFR-/);
    });
  });

  // ── AC3: Per-story gate selection ──
  describe("AC3: Per-story gate selection (not per-project)", () => {
    it("protocol determines gate type per story based on its own traces_to", () => {
      const content = readFileSync(REVIEW_GATE_CHECK_PATH, "utf8");
      // Must contain language about per-story determination
      expect(content).toMatch(/per.story|each story|story.s own|individual story/is);
    });
  });

  // ── AC4: Code Review and Security Review unchanged ──
  describe("AC4: Code Review and Security Review unchanged for infra stories", () => {
    it("infra gate mapping preserves Code Review gate", () => {
      const content = readFileSync(REVIEW_GATE_CHECK_PATH, "utf8");
      // The infra gate mapping should show Code Review as unchanged
      expect(content).toMatch(/Code Review\s*\|.*[Uu]nchanged/);
    });

    it("infra gate mapping preserves Security Review gate", () => {
      const content = readFileSync(REVIEW_GATE_CHECK_PATH, "utf8");
      // The infra gate mapping should show Security Review as unchanged
      expect(content).toMatch(/Security Review\s*\|.*[Uu]nchanged/);
    });
  });

  // ── AC5: Sprint state machine documentation updated ──
  //
  // E28-S166 moved the infra review gate narrative out of CLAUDE.md (per
  // ADR-048 / FR-327) and into the review-gate-check protocol file — which
  // is where the detection mechanism and gate substitutions are actually
  // implemented. These assertions now read from the protocol file directly
  // so the documentation-enforcement checks track the canonical source.
  describe("AC5: Sprint state machine documentation updated", () => {
    it("review-gate-check protocol exists", () => {
      expect(
        existsSync(REVIEW_GATE_CHECK_PATH),
        `Protocol not found at ${REVIEW_GATE_CHECK_PATH}`
      ).toBe(true);
    });

    it("review-gate-check protocol documents infra review gate substitutions", () => {
      const content = readFileSync(REVIEW_GATE_CHECK_PATH, "utf8");
      expect(content).toMatch(/infra.review.gate|infra.gate/i);
    });

    it("review-gate-check protocol documents Policy-as-Code Validation gate", () => {
      const content = readFileSync(REVIEW_GATE_CHECK_PATH, "utf8");
      expect(content).toContain("Policy-as-Code Validation");
    });

    it("review-gate-check protocol documents detection mechanism via ID prefix", () => {
      const content = readFileSync(REVIEW_GATE_CHECK_PATH, "utf8");
      expect(content).toMatch(/IR-|OR-|SR-/);
      expect(content).toMatch(/traces_to|requirement.*prefix|ID prefix/i);
    });

    it("review-gate-check protocol documents that Code Review and Security Review are unchanged", () => {
      const content = readFileSync(REVIEW_GATE_CHECK_PATH, "utf8");
      expect(content).toMatch(/Code Review.*unchanged|unchanged.*Code Review/is);
      expect(content).toMatch(/Security Review.*unchanged|unchanged.*Security Review/is);
    });
  });
});
