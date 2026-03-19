---
title: 'Val Save Session Validation'
validation-target: 'val-save-session workflow files'
---
## Structure
- [ ] workflow.yaml exists with correct YAML structure
- [ ] instructions.xml exists with valid XML structure
- [ ] checklist.md exists with frontmatter
- [ ] Directory path: _gaia/lifecycle/workflows/4-implementation/val-save-session/

## Configuration
- [ ] workflow.yaml name is "val-save-session"
- [ ] workflow.yaml module is "lifecycle"
- [ ] workflow.yaml agent is "validator"
- [ ] workflow.yaml model_override is "opus"
- [ ] input_file_patterns reference memory file paths
- [ ] required_skills reference memory-management.md
- [ ] required_skill_sections list all 4 sections (session-load, session-save, decision-formatting, context-summarization)

## Instructions Quality
- [ ] Exactly 5 steps in correct order: Load Session Context, Summarize Session, User Confirmation Gate, Write to Memory Files, Post-Save Verification
- [ ] Critical mandates include: user confirmation before writes, model_override enforcement, diplomatic communication
- [ ] Step 1 accepts both upstream and standalone session context
- [ ] Step 2 produces 3 distinct summaries (decision-log, conversation-context, ground-truth)
- [ ] Step 3 uses template-output checkpoint with [a]/[e]/[d] options
- [ ] Step 3 [d] discard ends workflow without any file writes
- [ ] Step 3 [e] edit allows modifications and re-presents for approval
- [ ] Step 4 initializes missing directory and files with header templates
- [ ] Step 4 decision-log uses standardized header format
- [ ] Step 4 conversation-context uses replace semantics
- [ ] Step 4 ground-truth uses append/update with superseded annotations
- [ ] Step 4 includes 80% budget warning for ground-truth.md
- [ ] Step 5 reads back and verifies all writes

## Output
- [ ] workflow-manifest.csv has val-save-session entry with command gaia-val-save
