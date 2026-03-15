---
title: 'Story Validation Check'
validation-target: 'Story validation'
---
## Frontmatter
- [ ] YAML frontmatter present with all 14 required fields: key, title, epic, status, priority, size, points, risk, sprint_id, depends_on, blocks, traces_to, date, author
- [ ] Field values are valid (status in state machine, priority P0/P1/P2, size S/M/L/XL, points match sizing_map, risk high/medium/low)
## Content
- [ ] User Story follows As a / I want / So that format
- [ ] All template sections present
- [ ] ACs are testable (Given/When/Then)
- [ ] Subtasks linked to AC numbers
- [ ] Test Scenarios table populated
- [ ] Dependencies valid
- [ ] Definition of Done items defined
## Output
- [ ] Validation result appended to story file
- [ ] Status updated to ready-for-dev (if PASS) or kept as validating (if FAIL)
