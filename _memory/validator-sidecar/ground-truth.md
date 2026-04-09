---
agent: validator
tier: 1
token_budget: 200000
last_refresh: "2026-04-09"
entry_count: 1
estimated_tokens: 900
---

# Ground Truth — Validator Agent

> Populated by Val during validation sessions. Contains verified filesystem facts, seeded by `/gaia-refresh-ground-truth`.

## Validation Rulesets

### gap-analysis-output (E19-S3, FR-223)

**Scope:** files matching `docs/test-artifacts/test-gap-analysis-*.md` produced
by `/gaia-test-gap-analysis`. This ruleset validates the FR-223 output schema
defined by `_gaia/lifecycle/templates/test-gap-analysis-template.md`.

**Schema version:** 1.0.0

**Frontmatter — required fields (missing any field = WARNING):**

- `mode` — must be exactly one of: `coverage`, `verification`
- `date` — non-empty ISO-8601 date string (YYYY-MM-DD)
- `project` — non-empty string
- `story_count` — integer ≥ 0
- `gap_count` — integer ≥ 0

**Frontmatter parse failure = CRITICAL.** The frontmatter block MUST parse
cleanly as YAML. A parse error (malformed YAML, missing `---` delimiters,
unquoted special characters) is a CRITICAL finding.

**Gap type enum (closed) — any other value = CRITICAL:**

- `missing-test`
- `unexecuted`
- `uncovered-ac`
- `missing-edge-case`

Adding a new gap type without bumping the schema version is a CRITICAL finding.
This enum is closed by design (E19-S3 AC2).

**Severity enum — any other value = CRITICAL:**

- `critical`
- `high`
- `medium`
- `low`

**Required sections (missing any = WARNING):**

1. `## Executive Summary`
2. `## Gap Table`
3. `## Per-Story Detail`
4. `## Recommendations`

**Gap Table column order (must appear in this order):**

1. `story_key`
2. `gap_type`
3. `severity`
4. `description`

A Gap Table with columns in a different order or with missing columns is a
WARNING. Each `gap_type` cell MUST match the enum above; each `severity` cell
MUST match the severity enum above.

**Cross-field consistency:**

- If `gap_count == 0`, the Executive Summary SHOULD contain the phrase
  `No coverage gaps detected` — absence is an INFO finding.
- `gap_count` SHOULD equal the number of data rows in the Gap Table
  (excluding the header and separator rows) — mismatch is a WARNING.

**References:** FR-223, ADR-030 §10.22, story E19-S3, test cases TGA-17–20.
