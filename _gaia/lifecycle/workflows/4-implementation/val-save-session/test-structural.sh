#!/usr/bin/env bash
# Structural validation tests for val-save-session workflow
# RED phase: define expected behavior, verify against ACs

WORKFLOW_DIR="_gaia/lifecycle/workflows/4-implementation/val-save-session"
PASS=0
FAIL=0
TOTAL=0

assert() {
  local desc="$1"
  local result="$2"
  TOTAL=$((TOTAL + 1))
  if [ "$result" = "true" ]; then
    echo "  PASS: $desc"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $desc"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== val-save-session Structural Tests ==="
echo ""

# AC1: Directory contains three required files
echo "--- AC1: Directory structure ---"
assert "workflow.yaml exists" "$([ -f "$WORKFLOW_DIR/workflow.yaml" ] && echo true || echo false)"
assert "instructions.xml exists" "$([ -f "$WORKFLOW_DIR/instructions.xml" ] && echo true || echo false)"
assert "checklist.md exists" "$([ -f "$WORKFLOW_DIR/checklist.md" ] && echo true || echo false)"

# AC2: workflow.yaml content checks
echo "--- AC2: workflow.yaml content ---"
assert "name is val-save-session" "$(grep -q '^name: val-save-session' "$WORKFLOW_DIR/workflow.yaml" && echo true || echo false)"
assert "module is lifecycle" "$(grep -q '^module: lifecycle' "$WORKFLOW_DIR/workflow.yaml" && echo true || echo false)"
assert "agent is validator" "$(grep -q '^agent: validator' "$WORKFLOW_DIR/workflow.yaml" && echo true || echo false)"
assert "model_override is opus" "$(grep -q '^model_override: opus' "$WORKFLOW_DIR/workflow.yaml" && echo true || echo false)"
assert "has installed_path" "$(grep -q 'installed_path:' "$WORKFLOW_DIR/workflow.yaml" && echo true || echo false)"
assert "has instructions reference" "$(grep -q 'instructions:' "$WORKFLOW_DIR/workflow.yaml" && echo true || echo false)"
assert "has validation reference" "$(grep -q 'validation:' "$WORKFLOW_DIR/workflow.yaml" && echo true || echo false)"
assert "has input_file_patterns" "$(grep -q 'input_file_patterns:' "$WORKFLOW_DIR/workflow.yaml" && echo true || echo false)"

# AC3: instructions.xml has exactly 5 steps in order
echo "--- AC3: instructions.xml step structure ---"
STEP_COUNT=$(grep -c '<step n=' "$WORKFLOW_DIR/instructions.xml")
assert "exactly 5 steps" "$([ "$STEP_COUNT" -eq 5 ] && echo true || echo false)"
assert "step 1 is Load Session Context" "$(grep -q 'n=\"1\" title=\"Load Session Context\"' "$WORKFLOW_DIR/instructions.xml" && echo true || echo false)"
assert "step 2 is Summarize Session" "$(grep -q 'n=\"2\" title=\"Summarize Session\"' "$WORKFLOW_DIR/instructions.xml" && echo true || echo false)"
assert "step 3 is User Confirmation Gate" "$(grep -q 'n=\"3\" title=\"User Confirmation Gate\"' "$WORKFLOW_DIR/instructions.xml" && echo true || echo false)"
assert "step 4 is Write to Memory Files" "$(grep -q 'n=\"4\" title=\"Write to Memory Files\"' "$WORKFLOW_DIR/instructions.xml" && echo true || echo false)"
assert "step 5 is Post-Save Verification" "$(grep -q 'n=\"5\" title=\"Post-Save Verification\"' "$WORKFLOW_DIR/instructions.xml" && echo true || echo false)"

# AC6: Confirmation gate with template-output and 3 options
echo "--- AC6: Confirmation gate ---"
assert "has template-output in step 3" "$(grep -q 'template-output' "$WORKFLOW_DIR/instructions.xml" && echo true || echo false)"
assert "has [a] Approve option" "$(grep -q '\[a\]' "$WORKFLOW_DIR/instructions.xml" && echo true || echo false)"
assert "has [e] Edit option" "$(grep -q '\[e\]' "$WORKFLOW_DIR/instructions.xml" && echo true || echo false)"
assert "has [d] Discard option" "$(grep -q '\[d\]' "$WORKFLOW_DIR/instructions.xml" && echo true || echo false)"

# AC7: Discard ends cleanly
echo "--- AC7: Discard behavior ---"
assert "discard ends without writes" "$(grep -q 'Session findings discarded' "$WORKFLOW_DIR/instructions.xml" && echo true || echo false)"

# AC10: Standardized header format
echo "--- AC10: Decision-log format ---"
assert "standardized header format referenced" "$(grep -q '\[YYYY-MM-DD\] Decision Title' "$WORKFLOW_DIR/instructions.xml" && echo true || echo false)"
assert "Agent metadata in header" "$(grep -q '\*\*Agent:\*\*' "$WORKFLOW_DIR/instructions.xml" && echo true || echo false)"
assert "Workflow metadata in header" "$(grep -q '\*\*Workflow:\*\*' "$WORKFLOW_DIR/instructions.xml" && echo true || echo false)"

# AC11: Conversation-context replace semantics
echo "--- AC11: Conversation-context semantics ---"
assert "replace semantics documented" "$(grep -qi 'replace' "$WORKFLOW_DIR/instructions.xml" && echo true || echo false)"

# AC12: Ground-truth append/update with superseded
echo "--- AC12: Ground-truth semantics ---"
assert "superseded annotation documented" "$(grep -q 'Superseded' "$WORKFLOW_DIR/instructions.xml" && echo true || echo false)"

# AC13: Memory file initialization
echo "--- AC13: First-time initialization ---"
assert "creates missing directory" "$(grep -q 'validator-sidecar/ directory exists' "$WORKFLOW_DIR/instructions.xml" && echo true || echo false)"
assert "creates missing files with templates" "$(grep -q 'header template' "$WORKFLOW_DIR/instructions.xml" && echo true || echo false)"

# AC14: Budget warning
echo "--- AC14: Budget warning ---"
assert "80% budget warning" "$(grep -q '80%' "$WORKFLOW_DIR/instructions.xml" && echo true || echo false)"
assert "200K token budget referenced" "$(grep -q '200K' "$WORKFLOW_DIR/instructions.xml" && echo true || echo false)"

# AC15: Post-save verification
echo "--- AC15: Post-save verification ---"
assert "reads back files" "$(grep -q 'Read back' "$WORKFLOW_DIR/instructions.xml" && echo true || echo false)"
assert "confirms writes succeeded" "$(grep -q 'verify writes succeeded' "$WORKFLOW_DIR/instructions.xml" && echo true || echo false)"

# AC16: Manifest entry
echo "--- AC16: Manifest entry ---"
assert "manifest has val-save-session" "$(grep -q 'val-save-session' "../_gaia/_config/workflow-manifest.csv" && echo true || echo false)"
assert "manifest command is gaia-val-save" "$(grep 'val-save-session' "../_gaia/_config/workflow-manifest.csv" | grep -q 'gaia-val-save' && echo true || echo false)"

# AC17: model_override opus
echo "--- AC17: model_override ---"
assert "model_override is opus" "$(grep -q 'model_override: opus' "$WORKFLOW_DIR/workflow.yaml" && echo true || echo false)"

echo ""
echo "=== Results: $PASS passed, $FAIL failed, $TOTAL total ==="
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
