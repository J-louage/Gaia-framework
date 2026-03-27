---
title: 'Story Creation Validation'
validation-target: 'Story file'
---
## Structure
- [ ] YAML frontmatter present with all 15 required fields: key, title, epic, status, priority, size, points, risk, sprint_id, depends_on, blocks, traces_to, date, author, priority_flag
- [ ] Acceptance criteria section complete
- [ ] Technical notes included
- [ ] Subtasks defined
- [ ] Definition of Done checklist present
## Quality
- [ ] Each AC uses Given/When/Then format
- [ ] Each AC is testable
- [ ] Dependencies correctly declared
- [ ] Status set to backlog
## Elaboration
- [ ] Step 4 offers [u] user answers or [a] agent-assisted elaboration
- [ ] Agent-assisted mode spawns PM (Derek) and Architect (Theo) subagents in parallel
- [ ] PM subagent loads epics-and-stories.md, prd.md, ux-design.md
- [ ] Architect subagent loads architecture.md, test-plan.md, epics-and-stories.md
- [ ] Consolidated agent responses presented for user review before proceeding
## Post-Save Validation (Steps 7-8)
- [ ] Val validates saved story for completeness, clarity, semantics, dependencies, and factual accuracy
- [ ] Val invoked via invoke-workflow to val-validate-artifact on saved file
- [ ] On zero findings: status set to ready-for-dev
- [ ] On findings: status set to validating, SM fixes, Val re-validates (loop)
- [ ] Hard limit: 3 validation attempts — if 3rd fails, status stays validating and workflow exits
- [ ] Error handling: Val failure logs warning, status stays backlog
## Val Memory Persistence (Step 9)
- [ ] Validation results auto-saved to Val memory sidecar (no user prompt)
- [ ] Decision-log entry appended with standardized header format
- [ ] Conversation-context updated with session summary (replace semantics)
- [ ] Memory save is non-blocking — failure logs warning and continues
## Next Step
- [ ] next-step does NOT reference /gaia-validate-story (validation is built-in)
## Output Verification
- [ ] Story file exists at {implementation_artifacts}/{story_key}-{story_title_slug}.md
- [ ] Filename starts with story key (e.g., 1.2-user-login.md)
