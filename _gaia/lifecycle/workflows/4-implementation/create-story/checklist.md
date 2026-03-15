---
title: 'Story Creation Validation'
validation-target: 'Story file'
---
## Structure
- [ ] YAML frontmatter present with all 14 required fields: key, title, epic, status, priority, size, points, risk, sprint_id, depends_on, blocks, traces_to, date, author
- [ ] Acceptance criteria section complete
- [ ] Technical notes included
- [ ] Subtasks defined
- [ ] Definition of Done checklist present
## Quality
- [ ] Each AC uses Given/When/Then format
- [ ] Each AC is testable
- [ ] Dependencies correctly declared
- [ ] Status set to backlog
## Output Verification
- [ ] Story file exists at {implementation_artifacts}/{story_key}-{story_title_slug}.md
- [ ] Filename starts with story key (e.g., 1.2-user-login.md)
