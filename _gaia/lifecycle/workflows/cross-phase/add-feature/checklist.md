---
title: 'Add Feature Validation'
validation-target: 'Feature Addition Cascade'
---
## Orchestration
- [ ] Feature scope captured and confirmed by user
- [ ] Context flows forward between steps (prd_diff → arch_diff → test_diff → stories)
- [ ] Steps intelligently skipped when not needed
## PRD Update
- [ ] PRD edited with new requirements
- [ ] New FR/NFR IDs captured for downstream steps
- [ ] Cascade to architecture classified (NONE/MINOR/SIGNIFICANT)
## Architecture Update (if applicable)
- [ ] Architecture edited with changes supporting new requirements
- [ ] New ADRs recorded
- [ ] Skipped with justification if cascade_to_arch == NONE
## Test Plan Update (if applicable)
- [ ] Test plan edited with new test cases
- [ ] New test cases map to new FR/NFR IDs
- [ ] Skipped with justification if no test-plan.md or no new testable behavior
## Story Creation
- [ ] New stories created with correct format
- [ ] Epic assignment confirmed (new or existing)
- [ ] Story protection enforced (no modification of locked stories)
## Traceability
- [ ] Traceability matrix regenerated
- [ ] New requirements → test cases → stories linked
## Summary
- [ ] Final summary presented to user with all artifact statuses
- [ ] Next steps communicated
