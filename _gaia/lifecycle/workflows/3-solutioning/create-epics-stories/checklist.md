---
title: 'Epics and Stories Validation'
validation-target: 'Epics and stories document'
required-inputs:
  - '{planning_artifacts}/prd.md'
  - '{planning_artifacts}/architecture.md'
---
## Epics
- [ ] Epics group related features logically
- [ ] Each epic has description and goal
## Stories
- [ ] Each story has acceptance criteria
- [ ] Each story has size estimate
- [ ] Each story follows user story format
## Dependencies
- [ ] depends_on declared for each story
- [ ] blocks declared for each story
- [ ] No circular dependencies
## Priority
- [ ] Stories ordered by dependency + priority
- [ ] Priority labels assigned (P0/P1/P2)
## Output Verification
- [ ] Output file exists at {planning_artifacts}/epics-and-stories.md
