---
title: 'Val Refresh Ground Truth Validation'
validation-target: 'Ground truth refresh workflow'
---
## Pre-conditions
- [ ] Validator agent persona exists at _gaia/lifecycle/agents/validator.md
- [ ] Slash command registered at .claude/commands/gaia-refresh-ground-truth.md
- [ ] Ground-truth-management skill available for JIT loading

## Workflow Structure
- [ ] workflow.yaml created with agent: validator and --incremental parameter
- [ ] instructions.xml implements complete scan protocol
- [ ] checklist.md validates workflow completeness

## Scan Protocol
- [ ] All 11 inventory targets scanned
- [ ] Section-by-section progress shown during scan
- [ ] Metadata extracted from each scanned file

## Ground Truth Output
- [ ] ground-truth.md updated with verified counts and locations
- [ ] Last-refresh timestamp in header
- [ ] Entries organized by category
- [ ] REMOVED status for deleted files (not silently purged)

## Diff Report
- [ ] Added/removed/updated counts generated
- [ ] Total entry count included
- [ ] Report presented to user
- [ ] Report logged to decision-log.md with date

## Modes
- [ ] Full refresh scans all targets (default)
- [ ] Incremental refresh filters by last-refresh timestamp
- [ ] Incremental limitation documented (misses deletions)

## First-Run
- [ ] Creates _memory/validator-sidecar/ if missing
- [ ] Initializes ground-truth.md, decision-log.md, conversation-context.md

## Skill Loading
- [ ] ground-truth-management sections loaded JIT
- [ ] Sections: full-refresh, incremental-refresh, entry-structure, conflict-resolution, token-budget

## Integration
- [ ] Manifest entry exists in workflow-manifest.csv
- [ ] Works identically standalone or as sub-step
- [ ] No special-case logic for invocation context
