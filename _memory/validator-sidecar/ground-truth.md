---
agent: validator
tier: 1
token_budget: 200000
last_refresh: "2026-04-15"
entry_count: 0
estimated_tokens: 0
---

# Ground Truth — Validator Agent

> Populated by Val during validation sessions. Contains verified filesystem facts, seeded by `/gaia-refresh-ground-truth`. Baseline timestamp bumped by dev-story E28-S3 as the gating prerequisite for the GAIA Native Conversion Program (AF-2026-04-15-1).

## Invariants

> Permanent rules Val must honor on every validation. Invariants are committed ground truth — they live inside the empty-seed envelope intentionally (see below) because they describe shipping-template contracts, not runtime-verified facts. The `entry_count: 0` / `estimated_tokens: 0` frontmatter values count runtime-populated entries only; static invariants are excluded from the count.

### [invariant] Empty-seed invariant for committed Tier 1 ground-truth.md files

**Rule:** Committed Tier 1 product-seed `ground-truth.md` files (the four files under `_memory/validator-sidecar/`, `_memory/architect-sidecar/`, `_memory/pm-sidecar/`, `_memory/sm-sidecar/`) MUST ship with frontmatter fields `entry_count: 0` and `estimated_tokens: 0`. These sidecars are empty templates by design — ground-truth content is populated at runtime by `/gaia-refresh-ground-truth`, never committed to the repository.

**Enforcement:** ATDD tests `test/validation/atdd/e8-s13.test.js`, `test/validation/atdd/e8-s13-automation.test.js`, and `test/validation/atdd/e9-s2.test.js` (per E9-S22) assert this invariant. A dedicated regression test `test/validation/atdd/e28-s31.test.js` walks all four committed seeds and fails CI if any frontmatter deviates.

**Source:** E28-S3 finding #5 — Val previously suggested regenerating the committed seed with full runtime content, which broke ATDD tests on macOS CI. The seed was re-minimized in-flight; this invariant prevents recurrence.

**Val anti-pattern detection:** During `val-validate-plan`, Val MUST flag as a CRITICAL finding any plan that proposes to regenerate, populate, or fill a committed Tier 1 seed with runtime content. Trigger phrases: "regenerate committed seed", "populate ground-truth.md with", "fill the seed with", "copy runtime ground truth into committed". Plans describing the runtime-only `/gaia-refresh-ground-truth` pathway are OUT of scope for this rule — the rule only fires when the plan targets committed files.

**NEVER:** Propose edits that would raise `entry_count` or `estimated_tokens` above `0` in any of the four committed Tier 1 seeds. **ALWAYS:** Treat a change to those two frontmatter fields on a committed seed as a CRITICAL finding in plan validation.
