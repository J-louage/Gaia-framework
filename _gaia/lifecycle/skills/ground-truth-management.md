---
name: ground-truth-management
version: '1.0'
applicable_agents: [validator]
description: 'Ground truth operations: entry structure, refresh strategies, conflict resolution, archival, token budget management, and brownfield extraction.'
sections: [entry-structure, incremental-refresh, full-refresh, conflict-resolution, archival, token-budget, brownfield-extraction]
---

<!-- SECTION: entry-structure -->
## Entry Structure

A ground-truth entry is a compact 3–4 line markdown block representing one verified fact.

### Format

```
**[{category}]** {factual statement}
Source: `{source_path}` | Verified: {YYYY-MM-DD} | Count: {N}
```

### Required Fields

| Field | Description |
|-------|-------------|
| **Fact category** | One of the 4 categories below |
| **Factual statement** | A single, verifiable assertion |
| **Source** | File path or glob that proves the fact |
| **Last-verified** | Date of last successful verification (ISO 8601) |
| **Verification count** | Number of times this fact has been confirmed |

### Fact Categories

- `file-inventory` — file existence, location, count (e.g., "25 agent files in `_gaia/*/agents/`")
- `structural-pattern` — architecture patterns, conventions, section structure (e.g., "workflow.yaml requires `name` field")
- `variable-inventory` — config variables, resolved values, defaults (e.g., "`project_path` defaults to `.`")
- `cross-reference` — links between artifacts, traceability entries (e.g., "ADR-012 referenced by E8-S1, E8-S9")

### Example Entry

```
**[file-inventory]** 8 shared dev skills in `_gaia/dev/skills/`
Source: `_gaia/dev/skills/*.md` | Verified: 2026-03-18 | Count: 3
```
<!-- END SECTION -->

<!-- SECTION: incremental-refresh -->
## Incremental Refresh

Updates ground truth by scanning only files changed since the last refresh.

### Change Detection

1. Run `git diff --name-only {last_refresh_commit}..HEAD` to get changed files
2. If no git history: fall back to file modification timestamps vs. `last-verified` dates
3. Filter to GAIA-relevant paths: `_gaia/`, `.claude/commands/`, `docs/`, config files

### Comparison Logic

For each changed file, extract verifiable facts and compare against existing entries:

1. **Match** — fact exists and value unchanged → update `last-verified` date, increment count
2. **Update** — fact exists but value changed → apply conflict-resolution rules
3. **New** — fact discovered with no existing entry → stage as candidate entry
4. **Stale** — existing entry's source file was modified but fact no longer present → flag for review

### Output Categories

| Category | Action |
|----------|--------|
| **Confirmed** | Entries re-verified, dates and counts updated |
| **Updated** | Entries modified via conflict resolution with changelog |
| **New** | Candidate entries pending addition |
| **Stale** | Entries whose source changed but fact not found — flag for user review |
<!-- END SECTION -->

<!-- SECTION: full-refresh -->
## Full Refresh

Complete scan of the framework and project to rebuild or reconcile the entire ground-truth inventory.

### Scan Targets

| Target | Path Pattern | Facts Extracted |
|--------|-------------|-----------------|
| Agents | `_gaia/*/agents/*.md` | Agent count, IDs, modules, extends relations |
| Workflows | `_gaia/*/workflows/**/*.yaml` | Workflow count, names, modules, instructions paths |
| Skills | `_gaia/*/skills/*.md` | Skill count, section markers, line counts |
| Slash commands | `.claude/commands/*.md` | Command count, names, referenced workflows |
| Manifests | `_gaia/_config/*.csv`, `_gaia/_config/*.yaml` | Manifest row counts, registered entries |
| Configs | `_gaia/_config/global.yaml`, `*/config.yaml` | Config keys, values, defaults |
| Artifacts | `docs/*-artifacts/*.md` | Artifact count per category, key metadata |

### Output Format

The scan produces a complete fact inventory structured by category. Each fact follows the entry-structure format. The inventory is then reconciled against existing `ground-truth.md`:

1. For each scanned fact: search existing entries for a matching category + statement
2. Apply incremental-refresh comparison logic (match / update / new / stale)
3. Entries in `ground-truth.md` with no corresponding scanned fact → mark as stale candidates
<!-- END SECTION -->

<!-- SECTION: conflict-resolution -->
## Conflict Resolution

Deterministic rules for resolving discrepancies between ground truth entries and filesystem state.

### Conflict Types

| Type | Condition | Resolution | User Confirmation |
|------|-----------|------------|-------------------|
| **Factual conflict** | Ground truth value differs from filesystem scan | Filesystem wins automatically | No |
| **Missing source** | Entry's source path no longer exists | Mark entry as `REMOVED` | Yes — before permanent deletion |
| **New fact** | Scan discovers a fact with no existing entry | Add new entry | No |

### Resolution Rules

1. **Filesystem is always source of truth** — when a factual conflict is detected (e.g., ground truth says "67 workflows" but scan finds 69), update the entry automatically
2. **Changelog note** — every update appends a note: `Updated: {old_value} → {new_value} (detected {date}, previous value set {prev_date})`
3. **Missing source** — if an entry's source file is deleted or moved, mark as `REMOVED` with the detection date. Require user confirmation before permanent removal from ground truth
4. **New facts** — add directly with verification count of 1 and current date

### Corrupted Entry Handling

When incremental or full refresh encounters an entry with malformed structure (missing required fields, broken markdown):

1. Flag the entry as `WARNING: malformed entry — {description of issue}`
2. Attempt reconstruction from the filesystem scan — re-extract facts from the source path
3. If reconstruction succeeds: replace the corrupted entry with the reconstructed version + changelog note
4. If reconstruction fails (source no longer exists): retain the corrupted entry with WARNING flag for manual review
5. **Never silently drop corrupted entries** — always flag and attempt recovery

### User Confirmation Matrix

| Action | Auto | Confirm |
|--------|------|---------|
| Update factual value | Yes | — |
| Add new entry | Yes | — |
| Reconstruct corrupted entry | Yes | — |
| Remove entry (source deleted) | — | Yes |
| Archive entry (budget pressure) | Yes | — |
<!-- END SECTION -->

<!-- SECTION: token-budget -->
## Token Budget Management

Monitors ground-truth.md size against Val's Tier 1 200K token budget (per ADR-014).

### Token Estimation

Approximate formula: `characters / 4 ≈ tokens`. For ground-truth.md:

```
file_chars = wc -m ground-truth.md
estimated_tokens = file_chars / 4
budget_pct = (estimated_tokens / 200000) * 100
```

### Budget Thresholds

| Level | Range | Action |
|-------|-------|--------|
| **GREEN** | < 60% (< 120K tokens) | No action needed |
| **YELLOW** | 60–80% (120K–160K tokens) | Suggest archival — list candidates |
| **RED** | > 80% (> 160K tokens) | Require archival before next save |

### Status Reporting

Every refresh workflow must report budget status:

```
Token Budget: {level} — {estimated_tokens}/200,000 ({pct}%)
Entries: {total_count} ({new} new, {updated} updated, {stale} stale)
{if YELLOW: "Archival recommended — {N} candidate entries"}
{if RED: "Archival required — must free {N} tokens before next write"}
```
<!-- END SECTION -->

<!-- SECTION: archival -->
## Archival

Moves low-value entries from `ground-truth.md` to `ground-truth-archive.md` when token budget pressure requires it.

### Trigger

Archival is triggered when token budget reaches RED threshold (> 80% of 200K tokens). YELLOW threshold suggests but does not require archival.

### Priority — Which Entries to Archive

1. Entries **not referenced in the last 3 validation runs** (oldest first)
2. Among equally unreferenced entries: oldest `last-verified` date first
3. Never archive entries with verification count > 10 unless they are also unreferenced

### Archive Process

1. Select candidate entries by priority until freeing enough tokens to reach GREEN threshold
2. For each archived entry: move the full entry to `ground-truth-archive.md` (same sidecar directory as `ground-truth.md`)
3. Leave a **one-line summary** in `ground-truth.md`: `[archived] {category}: {statement} → see ground-truth-archive.md`
4. Update token budget status after archival

### Archive File Format

`ground-truth-archive.md` mirrors the entry structure. Each archived entry retains all fields plus:

```
Archived: {date} | Reason: {budget_pressure|manual} | Last referenced: run-{N}
```

Val can still cross-reference archived entries when needed — load `ground-truth-archive.md` JIT.
<!-- END SECTION -->

<!-- SECTION: brownfield-extraction -->
## Brownfield Extraction

Seeds initial ground truth from existing project artifacts during `/gaia-brownfield` onboarding.

### Source Documents

| Document | Path | Facts to Extract |
|----------|------|-----------------|
| Brownfield assessment | `docs/planning-artifacts/brownfield-assessment.md` | Tech stack, dependencies, file counts, project structure |
| Project documentation | `docs/planning-artifacts/project-documentation.md` | Architecture patterns, conventions, config values |

### Parsing Rules

1. **Brownfield assessment** — extract from structured tables and inventories:
   - File counts per directory → `file-inventory` entries
   - Dependency list with versions → `variable-inventory` entries
   - Architecture patterns detected → `structural-pattern` entries

2. **Project documentation** — extract from narrative sections:
   - Config values and defaults → `variable-inventory` entries
   - Cross-references between components → `cross-reference` entries
   - Conventions documented → `structural-pattern` entries

3. **Filesystem scan** — complement document extraction with direct scanning:
   - Run full-refresh scan targets against `{project-path}`
   - Compare scanned facts against document-extracted facts
   - Resolve conflicts using conflict-resolution rules (filesystem wins)

### Initial Seeding Workflow

1. Parse brownfield-assessment.md → extract candidate entries
2. Parse project-documentation.md → extract candidate entries
3. Deduplicate: merge entries with matching category + statement
4. Run full-refresh scan to verify all candidates against filesystem
5. Write verified entries to `ground-truth.md` with verification count = 1
6. Report: `Seeded {N} ground-truth entries from brownfield artifacts + filesystem scan`
<!-- END SECTION -->
