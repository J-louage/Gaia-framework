---
agent: validator
tier: 1
token_budget: 200000
last_refresh: "2026-03-20T09:10:00Z"
entry_count: 345
estimated_tokens: 42000
---

# Ground Truth — Val (Validator Agent)

> Verified filesystem inventory of all GAIA framework assets.
> Populated by `/gaia-refresh-ground-truth`. Do not edit manually.
> Last verified: 2026-03-20 — counts confirmed against filesystem scan.

## File Inventory

### Workflows (71)

> 71 workflow.yaml files found across 4 modules. Verified count excludes 2 backup copies in `_backups/`.

#### Lifecycle (49)

- _gaia/lifecycle/workflows/1-analysis/advanced-elicitation/workflow.yaml
- _gaia/lifecycle/workflows/1-analysis/brainstorm-project/workflow.yaml
- _gaia/lifecycle/workflows/1-analysis/create-product-brief/workflow.yaml
- _gaia/lifecycle/workflows/1-analysis/domain-research/workflow.yaml
- _gaia/lifecycle/workflows/1-analysis/market-research/workflow.yaml
- _gaia/lifecycle/workflows/1-analysis/technical-research/workflow.yaml
- _gaia/lifecycle/workflows/2-planning/create-prd/workflow.yaml
- _gaia/lifecycle/workflows/2-planning/create-ux-design/workflow.yaml
- _gaia/lifecycle/workflows/2-planning/edit-prd/workflow.yaml
- _gaia/lifecycle/workflows/2-planning/validate-prd/workflow.yaml
- _gaia/lifecycle/workflows/3-solutioning/create-architecture/workflow.yaml
- _gaia/lifecycle/workflows/3-solutioning/create-epics-stories/workflow.yaml
- _gaia/lifecycle/workflows/3-solutioning/edit-architecture/workflow.yaml
- _gaia/lifecycle/workflows/3-solutioning/implementation-readiness/workflow.yaml
- _gaia/lifecycle/workflows/3-solutioning/infrastructure-design/workflow.yaml
- _gaia/lifecycle/workflows/3-solutioning/security-threat-model/workflow.yaml
- _gaia/lifecycle/workflows/4-implementation/add-stories/workflow.yaml
- _gaia/lifecycle/workflows/4-implementation/change-request/workflow.yaml
- _gaia/lifecycle/workflows/4-implementation/check-dod/workflow.yaml
- _gaia/lifecycle/workflows/4-implementation/check-review-gate/workflow.yaml
- _gaia/lifecycle/workflows/4-implementation/code-review/workflow.yaml
- _gaia/lifecycle/workflows/4-implementation/correct-course/workflow.yaml
- _gaia/lifecycle/workflows/4-implementation/create-story/workflow.yaml
- _gaia/lifecycle/workflows/4-implementation/dev-story/workflow.yaml
- _gaia/lifecycle/workflows/4-implementation/epic-status/workflow.yaml
- _gaia/lifecycle/workflows/4-implementation/fix-story/workflow.yaml
- _gaia/lifecycle/workflows/4-implementation/qa-generate-tests/workflow.yaml
- _gaia/lifecycle/workflows/4-implementation/retrospective/workflow.yaml
- _gaia/lifecycle/workflows/4-implementation/run-all-reviews/workflow.yaml
- _gaia/lifecycle/workflows/4-implementation/security-review/workflow.yaml
- _gaia/lifecycle/workflows/4-implementation/sprint-planning/workflow.yaml
- _gaia/lifecycle/workflows/4-implementation/sprint-status/workflow.yaml
- _gaia/lifecycle/workflows/4-implementation/tech-debt-review/workflow.yaml
- _gaia/lifecycle/workflows/4-implementation/triage-findings/workflow.yaml
- _gaia/lifecycle/workflows/4-implementation/val-refresh-ground-truth/workflow.yaml
- _gaia/lifecycle/workflows/4-implementation/val-save-session/workflow.yaml
- _gaia/lifecycle/workflows/4-implementation/val-validate-artifact/workflow.yaml
- _gaia/lifecycle/workflows/4-implementation/val-validate-plan/workflow.yaml
- _gaia/lifecycle/workflows/4-implementation/validate-story/workflow.yaml
- _gaia/lifecycle/workflows/5-deployment/deployment-checklist/workflow.yaml
- _gaia/lifecycle/workflows/5-deployment/post-deploy-verify/workflow.yaml
- _gaia/lifecycle/workflows/5-deployment/release-plan/workflow.yaml
- _gaia/lifecycle/workflows/5-deployment/rollback-plan/workflow.yaml
- _gaia/lifecycle/workflows/anytime/brownfield-onboarding/workflow.yaml
- _gaia/lifecycle/workflows/anytime/document-project/workflow.yaml
- _gaia/lifecycle/workflows/anytime/generate-project-context/workflow.yaml
- _gaia/lifecycle/workflows/anytime/memory-hygiene/workflow.yaml
- _gaia/lifecycle/workflows/anytime/performance-review/workflow.yaml
- _gaia/lifecycle/workflows/cross-phase/add-feature/workflow.yaml
- _gaia/lifecycle/workflows/quick-flow/quick-dev/workflow.yaml
- _gaia/lifecycle/workflows/quick-flow/quick-spec/workflow.yaml

#### Core (2)

- _gaia/core/workflows/brainstorming/workflow.yaml
- _gaia/core/workflows/party-mode/workflow.yaml

#### Creative (7)

- _gaia/creative/workflows/creative-sprint/workflow.yaml
- _gaia/creative/workflows/design-thinking/workflow.yaml
- _gaia/creative/workflows/innovation-strategy/workflow.yaml
- _gaia/creative/workflows/pitch-deck/workflow.yaml
- _gaia/creative/workflows/problem-solving/workflow.yaml
- _gaia/creative/workflows/slide-deck/workflow.yaml
- _gaia/creative/workflows/storytelling/workflow.yaml

#### Testing (13)

- _gaia/testing/workflows/accessibility-testing/workflow.yaml
- _gaia/testing/workflows/atdd/workflow.yaml
- _gaia/testing/workflows/ci-setup/workflow.yaml
- _gaia/testing/workflows/edit-test-plan/workflow.yaml
- _gaia/testing/workflows/mobile-testing/workflow.yaml
- _gaia/testing/workflows/nfr-assessment/workflow.yaml
- _gaia/testing/workflows/performance-testing/workflow.yaml
- _gaia/testing/workflows/teach-me-testing/workflow.yaml
- _gaia/testing/workflows/test-automation/workflow.yaml
- _gaia/testing/workflows/test-design/workflow.yaml
- _gaia/testing/workflows/test-framework/workflow.yaml
- _gaia/testing/workflows/test-review/workflow.yaml
- _gaia/testing/workflows/traceability/workflow.yaml

### Agents (26 + 1 base)

> 26 unique agent personas plus 1 base template (_base-dev.md). Total 27 .md files in agents/ directories.

#### Lifecycle (12)

- _gaia/lifecycle/agents/analyst.md
- _gaia/lifecycle/agents/architect.md
- _gaia/lifecycle/agents/data-engineer.md
- _gaia/lifecycle/agents/devops.md
- _gaia/lifecycle/agents/performance.md
- _gaia/lifecycle/agents/pm.md
- _gaia/lifecycle/agents/qa.md
- _gaia/lifecycle/agents/security.md
- _gaia/lifecycle/agents/sm.md
- _gaia/lifecycle/agents/tech-writer.md
- _gaia/lifecycle/agents/ux-designer.md
- _gaia/lifecycle/agents/validator.md

#### Dev (6 + 1 base)

- _gaia/dev/agents/_base-dev.md (shared base template)
- _gaia/dev/agents/angular-dev.md
- _gaia/dev/agents/flutter-dev.md
- _gaia/dev/agents/java-dev.md
- _gaia/dev/agents/mobile-dev.md
- _gaia/dev/agents/python-dev.md
- _gaia/dev/agents/typescript-dev.md

#### Creative (6)

- _gaia/creative/agents/brainstorming-coach.md
- _gaia/creative/agents/design-thinking-coach.md
- _gaia/creative/agents/innovation-strategist.md
- _gaia/creative/agents/presentation-designer.md
- _gaia/creative/agents/problem-solver.md
- _gaia/creative/agents/storyteller.md

#### Core (1)

- _gaia/core/agents/orchestrator.md

#### Testing (1)

- _gaia/testing/agents/test-architect.md

### Skills (11)

> 8 dev skills + 3 lifecycle skills. Total 11 shared skill files.

#### Dev Skills (8)

- _gaia/dev/skills/api-design.md
- _gaia/dev/skills/code-review-standards.md
- _gaia/dev/skills/database-design.md
- _gaia/dev/skills/docker-workflow.md
- _gaia/dev/skills/documentation-standards.md
- _gaia/dev/skills/git-workflow.md
- _gaia/dev/skills/security-basics.md
- _gaia/dev/skills/testing-patterns.md

#### Lifecycle Skills (3)

- _gaia/lifecycle/skills/ground-truth-management.md
- _gaia/lifecycle/skills/memory-management.md
- _gaia/lifecycle/skills/validation-patterns.md

### Slash Commands (116)

> 116 gaia-*.md files found in .claude/commands/. Verified count.

### Instructions (71)

> 71 instructions.xml files found across all workflow directories.

### Templates (1)

> 1 template.md file found.

- _gaia/core/workflows/brainstorming/template.md

### Manifests (6)

- _gaia/_config/agent-manifest.csv
- _gaia/_config/files-manifest.csv
- _gaia/_config/gaia-help.csv
- _gaia/_config/skill-manifest.csv
- _gaia/_config/task-manifest.csv
- _gaia/_config/workflow-manifest.csv

## Path Verification

> Manifest paths checked against actual file locations.
> Verified: 2026-03-20. All 69 workflow-manifest.csv entries checked.

All 69 workflow paths in workflow-manifest.csv resolve to existing workflow.yaml files. No path mismatches found.

## Manifest Coverage

> Files that exist on disk but are not registered in the corresponding manifest CSV.

### Workflow Manifest Gaps (4 workflows not in workflow-manifest.csv)

| Workflow | Path | Status |
|----------|------|--------|
| check-dod | _gaia/lifecycle/workflows/4-implementation/check-dod/workflow.yaml | NOT IN MANIFEST |
| check-review-gate | _gaia/lifecycle/workflows/4-implementation/check-review-gate/workflow.yaml | NOT IN MANIFEST |
| run-all-reviews | _gaia/lifecycle/workflows/4-implementation/run-all-reviews/workflow.yaml | NOT IN MANIFEST |
| memory-hygiene | _gaia/lifecycle/workflows/anytime/memory-hygiene/workflow.yaml | NOT IN MANIFEST |

> 4 workflows exist on disk but have no entry in workflow-manifest.csv. These workflows have slash commands but are unregistered in the manifest.

## Variables

> Framework variables and their resolution paths.

| Variable | Source | Value |
|----------|--------|-------|
| `{project-root}` | Engine (filesystem) | Root directory where `_gaia/` lives |
| `{project-path}` | global.yaml → `project_path` | `{project-root}/Gaia-framework` (or `{project-root}` if ".") |
| `{installed_path}` | workflow.yaml location | Per-workflow, resolved from workflow dir |
| `{date}` | System | Current date at runtime |
| `{implementation_artifacts}` | global.yaml | `{project-root}/docs/implementation-artifacts` |
| `{planning_artifacts}` | global.yaml | `{project-root}/docs/planning-artifacts` |
| `{test_artifacts}` | global.yaml | `{project-root}/docs/test-artifacts` |
| `{creative_artifacts}` | global.yaml | `{project-root}/docs/creative-artifacts` |
| `{config_path}` | global.yaml | `{project-root}/_gaia/_config` |
| `{memory_path}` | global.yaml | `{project-root}/_memory` |
| `{checkpoint_path}` | global.yaml | `{project-root}/_memory/checkpoints` |

## Skill System

> Shared skill registry and section patterns.

- **Dev skills (8):** git-workflow, api-design, database-design, docker-workflow, testing-patterns, code-review-standards, documentation-standards, security-basics
- **Lifecycle skills (3):** ground-truth-management, memory-management, validation-patterns
- **Total:** 11 shared skills
- **Section loading:** Skills support `<!-- SECTION: xxx -->` markers for JIT sectioned loading
- **Registry:** `_gaia/dev/skills/_skill-index.yaml` (dev), `_gaia/lifecycle/skills/_skill-index.yaml` (lifecycle)

## Command Structure

> Slash command routing and workflow mappings.

- **116 slash commands** registered in `.claude/commands/gaia-*.md`
- **Command naming:** `gaia-{action}` for workflows, `gaia-agent-{name}` for agent activations
- **Routing:** Each slash command file specifies a workflow.yaml path or agent.md path
- **Workflow manifest:** 69 entries in `workflow-manifest.csv` mapping name → path → command → agent
