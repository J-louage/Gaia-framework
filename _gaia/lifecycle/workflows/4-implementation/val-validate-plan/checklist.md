---
title: val-validate-plan Validation Checklist
validation-target: val-validate-plan workflow
---

# val-validate-plan — Validation Checklist

## Structure
- [ ] workflow.yaml exists with correct fields (name, module, agent, model_override, instructions, validation)
- [ ] instructions.xml exists with numbered steps in correct order
- [ ] checklist.md exists with validation items
- [ ] model_override set to opus in workflow.yaml

## Protocol Completeness
- [ ] Step 1: Plan parsing extracts file targets, version bumps, and ADR references
- [ ] Step 2: File target verification classifies by action verb (Create vs Modify vs Delete)
- [ ] Step 3: Version bump verification compares plan vs codebase semver values
- [ ] Step 4: Completeness verification checks for related manifest/config/command files
- [ ] Step 5: Architecture cross-reference checks ADR alignment (with ground truth fallback)
- [ ] Step 6: Findings classified by severity (CRITICAL/WARNING/INFO) with discussion loop
- [ ] Step 7: Approved findings written to plan artifact under Plan Validation Findings section

## Quality
- [ ] Val is read-only on plan content (append-only for findings section)
- [ ] Findings use concise one-line-per-finding table format
- [ ] Discussion loop allows user to approve, dismiss, or edit individual findings
- [ ] Ground truth fallback produces INFO finding when not seeded (not a hard error)
- [ ] Skill sections loaded JIT (claim-extraction, filesystem-verification, severity-classification, findings-formatting)

## Integration
- [ ] workflow-manifest.csv contains val-validate-plan entry
- [ ] Slash command file exists at .claude/commands/gaia-val-validate-plan.md
- [ ] Agent field set to validator
