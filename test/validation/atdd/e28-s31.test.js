import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import yaml from "js-yaml";
import { PROJECT_ROOT } from "../../helpers/project-root.js";

/**
 * E28-S31: Val empty-seed invariant for committed Tier 1 ground-truth.md files
 *
 * Invariant (per E9-S22, E28-S3 finding #5): the four committed Tier 1
 * product-seed ground-truth.md files MUST ship as empty templates with
 * frontmatter `entry_count: 0` and `estimated_tokens: 0`. Ground-truth
 * content is populated at runtime by `/gaia-refresh-ground-truth` inside
 * the consumer project's _memory/, never committed to the framework repo.
 *
 * This regression test guards against a repeat of E28-S3 iteration 2, where
 * Val suggested regenerating the committed seed with full runtime content
 * and broke ATDD tests `e8-s13.test.js`, `e8-s13-automation.test.js`, and
 * `e9-s2.test.js` on macOS CI.
 *
 * Source of the rule:
 *   - _memory/validator-sidecar/ground-truth.md → "Invariants"
 *   - _gaia/lifecycle/skills/memory-management.md SECTION: empty-seed-invariant
 *   - _gaia/lifecycle/agents/validator.md <rules>
 *   - _gaia/lifecycle/workflows/4-implementation/val-validate-plan/instructions.xml step 4b
 */

const MEMORY_DIR = join(PROJECT_ROOT, "_memory");

const TIER_1_SEEDS = ["validator-sidecar", "architect-sidecar", "pm-sidecar", "sm-sidecar"];

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    throw new Error("No YAML frontmatter delimited by --- found");
  }
  return yaml.load(match[1]);
}

describe("E28-S31: empty-seed invariant for committed Tier 1 ground-truth.md files", () => {
  for (const sidecar of TIER_1_SEEDS) {
    describe(`${sidecar}/ground-truth.md`, () => {
      const seedPath = join(MEMORY_DIR, sidecar, "ground-truth.md");

      it("exists as a committed template file", () => {
        expect(existsSync(seedPath), `Committed Tier 1 seed missing: ${seedPath}`).toBe(true);
      });

      it("ships with entry_count: 0 and estimated_tokens: 0", () => {
        const content = readFileSync(seedPath, "utf-8");
        const frontmatter = parseFrontmatter(content);

        expect(
          frontmatter.entry_count,
          `Empty-seed invariant violated: ${sidecar}/ground-truth.md has entry_count=${frontmatter.entry_count} (expected 0). Committed Tier 1 seeds MUST ship as empty templates. Ground-truth content is populated at runtime by /gaia-refresh-ground-truth, never committed.`
        ).toBe(0);

        expect(
          frontmatter.estimated_tokens,
          `Empty-seed invariant violated: ${sidecar}/ground-truth.md has estimated_tokens=${frontmatter.estimated_tokens} (expected 0). Committed Tier 1 seeds MUST ship as empty templates.`
        ).toBe(0);
      });

      it("has tier: 1 in frontmatter (defines this as a Tier 1 seed)", () => {
        const content = readFileSync(seedPath, "utf-8");
        const frontmatter = parseFrontmatter(content);
        expect(frontmatter.tier).toBe(1);
      });
    });
  }

  describe("poisoned-seed fixture detection (parse-only guardrail)", () => {
    it("the frontmatter parser correctly detects a populated entry_count", () => {
      const poisoned = [
        "---",
        "agent: validator",
        "tier: 1",
        "token_budget: 200000",
        'last_refresh: "2026-04-15"',
        "entry_count: 42",
        "estimated_tokens: 12000",
        "---",
        "",
        "# Poisoned seed fixture",
        "",
      ].join("\n");

      const frontmatter = parseFrontmatter(poisoned);

      // Meta-assertion: the check used on committed seeds would fail on this fixture.
      expect(frontmatter.entry_count).toBe(42);
      expect(frontmatter.estimated_tokens).toBe(12000);
      expect(frontmatter.entry_count === 0).toBe(false);
      expect(frontmatter.estimated_tokens === 0).toBe(false);
    });
  });

  describe("invariant documentation is captured in committed rule sources", () => {
    it("validator ground-truth.md contains the Invariants section and empty-seed rule", () => {
      const gt = readFileSync(join(MEMORY_DIR, "validator-sidecar", "ground-truth.md"), "utf-8");
      expect(gt).toMatch(/## Invariants/);
      expect(gt).toMatch(/empty-seed invariant/i);
      expect(gt).toMatch(/entry_count: 0/);
      expect(gt).toMatch(/estimated_tokens: 0/);
    });

    it("memory-management skill contains the empty-seed-invariant section", () => {
      const skill = readFileSync(
        join(PROJECT_ROOT, "_gaia", "lifecycle", "skills", "memory-management.md"),
        "utf-8"
      );
      expect(skill).toMatch(/SECTION: empty-seed-invariant/);
      expect(skill).toMatch(/## Empty-Seed Invariant/);
    });

    it("val-validate-plan instructions contain the anti-pattern detection step", () => {
      const xml = readFileSync(
        join(
          PROJECT_ROOT,
          "_gaia",
          "lifecycle",
          "workflows",
          "4-implementation",
          "val-validate-plan",
          "instructions.xml"
        ),
        "utf-8"
      );
      expect(xml).toMatch(/Empty-Seed Invariant Anti-Pattern Detection/);
      expect(xml).toMatch(/E28-S31/);
    });

    it("validator.md agent file contains the empty-seed invariant rule", () => {
      const v = readFileSync(
        join(PROJECT_ROOT, "_gaia", "lifecycle", "agents", "validator.md"),
        "utf-8"
      );
      expect(v).toMatch(/Empty-seed invariant/);
      expect(v).toMatch(/E28-S31/);
    });
  });
});
