---
name: 'resume'
description: 'Resume from last checkpoint after context loss or session break.'
---

IT IS CRITICAL THAT YOU FOLLOW THESE STEPS:

<steps CRITICAL="TRUE">
1. SCAN {project-root}/_gaia/_memory/checkpoints/ for .yaml files (exclude completed/)
2. If no checkpoints found: report "No active workflows to resume" and suggest /gaia
3. If one checkpoint: display its summary and offer Resume / Restart / Discard
4. If multiple checkpoints: list all with timestamps, ask user which to resume
5. On resume: load the workflow.yaml from checkpoint, skip to the recorded step number
6. Continue execution from that step
</steps>

$ARGUMENTS
