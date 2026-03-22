# val-validate-artifact — Workflow Checklist

## File Structure
- [ ] `workflow.yaml` exists in `val-validate-artifact/`
- [ ] `instructions.xml` exists in `val-validate-artifact/`
- [ ] `checklist.md` exists in `val-validate-artifact/`

## workflow.yaml Verification
- [ ] `name: val-validate-artifact`
- [ ] `module: lifecycle`
- [ ] `agent: validator`
- [ ] `model_override: opus` — mandatory, not configurable (ADR-012)
- [ ] `installed_path` correctly set
- [ ] `instructions` references `{installed_path}/instructions.xml`
- [ ] `validation` references `{installed_path}/checklist.md`
- [ ] `input_file_patterns` includes target artifact and ground-truth paths
- [ ] `on_error` handles missing ground truth gracefully (continue without cross-reference)
- [ ] `on_error` halts on missing artifact
- [ ] `output.primary` references the target artifact itself

## instructions.xml Verification
- [ ] Exactly 8 steps present
- [ ] Step 1: Parse Artifact — heading structure, section map, chunking strategy
- [ ] Step 2: Extract Claims — JIT loads `claim-extraction` section, handles no-claims edge case
- [ ] Step 3: Filesystem Verify — JIT loads `filesystem-verification` section
- [ ] Step 4: Cross-Reference Ground Truth — JIT loads `cross-reference` section, handles missing/empty ground truth
- [ ] Step 5: Classify Findings — JIT loads `severity-classification` section, three severity levels (CRITICAL/WARNING/INFO)
- [ ] Step 6: Discussion Loop — `template-output` checkpoint, user confirmation enforced
- [ ] Step 7: Write Approved Findings — JIT loads `findings-formatting` section, replaces existing findings section
- [ ] Step 8: Save to Val Memory — auto-saves decision-log + conversation-context (no user prompt)

## Skill Section References
- [ ] `claim-extraction` referenced in Step 2
- [ ] `filesystem-verification` referenced in Step 3
- [ ] `cross-reference` referenced in Step 4
- [ ] `severity-classification` referenced in Step 5
- [ ] `findings-formatting` referenced in Step 7

## Edge Cases
- [ ] No-claims artifact: graceful completion with "No factual claims identified" message
- [ ] Missing ground truth: filesystem verification runs, note included in findings
- [ ] Empty ground truth: same behavior as missing
- [ ] All findings disputed: no findings written, graceful completion
- [ ] Existing `## Validation Findings` section: replaced entirely (not appended)

## Quality Checks
- [ ] Diplomatic framing enforced (Val proposes, user decides)
- [ ] User confirmation mandatory before writing findings (template-output in Step 6)
- [ ] `model_override: opus` enforced — workflow fails clearly if opus unavailable
- [ ] Findings include timestamp and workflow version
- [ ] `<next-step>` block references `/gaia-val-validate` (no /gaia-val-save — auto-save is built-in)

## Integration
- [ ] `workflow-manifest.csv` has `val-validate-artifact` entry with correct fields
