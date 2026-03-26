---
name: 'validate-prd'
description: 'DEPRECATED — Redirects to /gaia-val-validate'
model: sonnet
---

> **This command is deprecated.**
>
> `/gaia-validate-prd` has been replaced by `/gaia-val-validate`, which provides unified artifact validation through Val's document-specific rulesets.
>
> **What changed:** Val now handles all artifact validation (PRDs, architecture docs, UX designs, and more) using document-specific rulesets. There is no longer a separate PRD-only validation workflow.
>
> **What to do:** Run `/gaia-val-validate` instead. It accepts any artifact type and applies the appropriate validation rules automatically.

<steps CRITICAL="TRUE">
1. LOAD the FULL {project-root}/_gaia/core/engine/workflow.xml
2. READ its entire contents — this is the CORE OS
3. Pass {project-root}/_gaia/lifecycle/workflows/4-implementation/val-validate-artifact/workflow.yaml as 'workflow-config'
4. Follow workflow.xml instructions EXACTLY
5. Save outputs after EACH section
</steps>

$ARGUMENTS
