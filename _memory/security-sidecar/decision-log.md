# Threat Model Decisions — GAIA Framework

**Date:** 2026-03-14
**Author:** Zara (Application Security Expert)

## Key Decisions

### D-01: eval removal is highest priority security fix
- `eval` on user-controlled `$TARGET` in `cmd_validate` is the only code injection vector
- Must be replaced with direct command execution using quoted variables
- Maps to SR-1, SR-2; threat T-01 (DREAD 7.2)

### D-02: CI/CD pipeline must isolate publish from PR context
- `publish.yml` must ONLY use `on: release` trigger
- npm token must not be available in PR-triggered workflows
- GitHub Environment with approval required for publish
- Maps to SR-3, SR-4, SR-5; threats T-02, T-03

### D-03: npm provenance is mandatory for all publishes
- `npm publish --provenance` provides verifiable publisher identity
- Combined with checksums.txt for integrity verification
- Maps to SR-6, SR-7; threats T-04, T-13

### D-04: Template-output path validation needed in workflow engine
- Engine should validate output paths resolve within {project-root}
- instruction-validator should flag paths with `..` or absolute paths
- Maps to SR-8, SR-9; threat T-05

### D-05: Plaintext state files are acceptable risk
- Framework is local-only; OS permissions are the access control layer
- Encrypting state would add complexity without security benefit
- Checkpoint sha256 checksums detect accidental modification

### D-06: CODEOWNERS required for CI workflow files
- `.github/workflows/` changes require designated reviewer approval
- All workflows use explicit `permissions:` blocks
- Maps to SR-10, SR-11; threats T-08, T-09

## Risk Acceptance
- Plaintext state (accepted): local tool, OS permissions sufficient
- Checkpoint forgery (accepted with monitoring): sha256 detects drift, user warned
- Slash command modification (accepted): git review is appropriate control
