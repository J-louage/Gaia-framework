# GAIA Agent Memory

This directory contains persistent agent memory that survives framework updates.
Migrated from `_gaia/_memory/` per ADR-013.

## Structure

```
_memory/
├── checkpoints/              # Workflow checkpoints (gitignored)
│   └── completed/            # Archived completed checkpoints
├── {agent}-sidecar/          # Per-agent memory directories
│   ├── ground-truth.md       # Tier 1 only — verified domain facts
│   ├── decision-log.md       # All tiers — session decisions
│   ├── conversation-context.md  # Tier 1+2 — session context
│   └── archive/              # Archived entries (gitignored)
├── config.yaml               # Token budgets, cross-ref matrix
└── README.md                 # This file
```

## Rollback Procedure

This memory directory was created by the E8-S1 migration commit. To rollback:

1. Identify the migration commit: `git log --oneline --all | grep "memory directory migration"`
2. Revert the commit: `git revert <commit-hash>`
3. This restores:
   - `_gaia/_config/global.yaml` paths back to `_gaia/_memory/`
   - `.gitignore` patterns back to `_gaia/_memory/` exclusions
   - Removes the `_memory/` directory at project root
4. The original `_gaia/_memory/` structure remains intact (copy-then-verify pattern — originals were not deleted)

**Note:** After reverting, run `/gaia-build-configs` to regenerate resolved configs with restored paths.
