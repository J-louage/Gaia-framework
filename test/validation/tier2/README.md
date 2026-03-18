# Tier 2 Behavioral Tests

Tier 2 tests validate workflow engine behavior that requires the LLM runtime (Claude Code). These cannot run in CI — they are executed locally as part of the pre-release checklist.

## Tests

| Test | What It Verifies |
|------|-----------------|
| Step ordering | Steps execute in strict numerical order, none skipped |
| Checkpoint writing | Checkpoint YAML contains required fields, sha256 checksums valid |
| Quality gate enforcement | Workflow halts when a gate fails |
| Execution mode switching | Normal ↔ YOLO transitions |
| Resume from checkpoint | /gaia-resume reconstructs state |
| sha256 file change detection | Modified files detected on resume |

## How to Run

Run via Claude Code commands:
```
/gaia-validate-framework
```

## Result Storage

Results are written to `_gaia/_memory/tier2-results/{test-name}-{date}.yaml` with fields:
- `test_name`
- `date`
- `result` (pass/fail)
- `observations`
- `runner`
- `framework_version`

Results are committed to the repository alongside the code they validate.
