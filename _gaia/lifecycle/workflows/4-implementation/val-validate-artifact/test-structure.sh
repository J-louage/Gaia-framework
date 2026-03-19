#!/bin/bash
# Structural validation tests for E8-S6: val-validate-artifact workflow
# These tests verify all acceptance criteria are met.

WORKFLOW_DIR="_gaia/lifecycle/workflows/4-implementation/val-validate-artifact"
MANIFEST="_gaia/_config/workflow-manifest.csv"
ROOT=$(cd "$(dirname "$0")/../../../../.." && pwd)
PASS=0
FAIL=0

pass() { echo "  ✓ $1"; PASS=$((PASS + 1)); }
fail() { echo "  ✗ $1"; FAIL=$((FAIL + 1)); }

cd "$ROOT"

echo "=== E8-S6 Structural Tests ==="
echo ""

# AC1: Directory contains three files
echo "AC1: Workflow directory structure"
[ -f "$WORKFLOW_DIR/workflow.yaml" ] && pass "workflow.yaml exists" || fail "workflow.yaml missing"
[ -f "$WORKFLOW_DIR/instructions.xml" ] && pass "instructions.xml exists" || fail "instructions.xml missing"
[ -f "$WORKFLOW_DIR/checklist.md" ] && pass "checklist.md exists" || fail "checklist.md missing"

# AC2: workflow.yaml fields
echo ""
echo "AC2: workflow.yaml required fields"
if [ -f "$WORKFLOW_DIR/workflow.yaml" ]; then
  grep -q "^name: val-validate-artifact" "$WORKFLOW_DIR/workflow.yaml" && pass "name field correct" || fail "name field incorrect"
  grep -q "^module: lifecycle" "$WORKFLOW_DIR/workflow.yaml" && pass "module field correct" || fail "module field incorrect"
  grep -q "^agent: validator" "$WORKFLOW_DIR/workflow.yaml" && pass "agent field correct" || fail "agent field incorrect"
  grep -q "model_override: opus" "$WORKFLOW_DIR/workflow.yaml" && pass "model_override: opus present" || fail "model_override: opus missing (AC15)"
  grep -q "installed_path:" "$WORKFLOW_DIR/workflow.yaml" && pass "installed_path present" || fail "installed_path missing"
  grep -q "instructions:" "$WORKFLOW_DIR/workflow.yaml" && pass "instructions present" || fail "instructions missing"
  grep -q "validation:" "$WORKFLOW_DIR/workflow.yaml" && pass "validation present" || fail "validation missing"
  grep -q "input_file_patterns:" "$WORKFLOW_DIR/workflow.yaml" && pass "input_file_patterns present" || fail "input_file_patterns missing"
else
  fail "workflow.yaml not found — skipping field checks"
fi

# AC3: instructions.xml has exactly 7 steps
echo ""
echo "AC3: instructions.xml step structure"
if [ -f "$WORKFLOW_DIR/instructions.xml" ]; then
  STEP_COUNT=$(grep -c '<step n=' "$WORKFLOW_DIR/instructions.xml")
  [ "$STEP_COUNT" -eq 7 ] && pass "Exactly 7 steps found" || fail "Expected 7 steps, found $STEP_COUNT"

  # Verify step titles in order
  grep -q 'n="1".*Parse Artifact' "$WORKFLOW_DIR/instructions.xml" && pass "Step 1: Parse Artifact" || fail "Step 1 title mismatch"
  grep -q 'n="2".*Extract Claims' "$WORKFLOW_DIR/instructions.xml" && pass "Step 2: Extract Claims" || fail "Step 2 title mismatch"
  grep -q 'n="3".*Filesystem Verify' "$WORKFLOW_DIR/instructions.xml" && pass "Step 3: Filesystem Verify" || fail "Step 3 title mismatch"
  grep -q 'n="4".*Cross-Reference Ground Truth' "$WORKFLOW_DIR/instructions.xml" && pass "Step 4: Cross-Reference Ground Truth" || fail "Step 4 title mismatch"
  grep -q 'n="5".*Classify Findings' "$WORKFLOW_DIR/instructions.xml" && pass "Step 5: Classify Findings" || fail "Step 5 title mismatch"
  grep -q 'n="6".*Discussion Loop' "$WORKFLOW_DIR/instructions.xml" && pass "Step 6: Discussion Loop" || fail "Step 6 title mismatch"
  grep -q 'n="7".*Write Approved Findings' "$WORKFLOW_DIR/instructions.xml" && pass "Step 7: Write Approved Findings" || fail "Step 7 title mismatch"
else
  fail "instructions.xml not found — skipping step checks"
fi

# AC5-9: Skill section references (must match validation-patterns.md section names exactly)
echo ""
echo "AC5-9: Skill section references"
if [ -f "$WORKFLOW_DIR/instructions.xml" ]; then
  grep -q "claim-extraction" "$WORKFLOW_DIR/instructions.xml" && pass "claim-extraction section referenced" || fail "claim-extraction section NOT referenced"
  grep -q "filesystem-verification" "$WORKFLOW_DIR/instructions.xml" && pass "filesystem-verification section referenced" || fail "filesystem-verification section NOT referenced"
  grep -q "cross-reference" "$WORKFLOW_DIR/instructions.xml" && pass "cross-reference section referenced" || fail "cross-reference section NOT referenced"
  grep -q "severity-classification" "$WORKFLOW_DIR/instructions.xml" && pass "severity-classification section referenced" || fail "severity-classification section NOT referenced"
  grep -q "findings-formatting" "$WORKFLOW_DIR/instructions.xml" && pass "findings-formatting section referenced" || fail "findings-formatting section NOT referenced"
else
  fail "instructions.xml not found — skipping skill section checks"
fi

# AC8: Ground truth missing/empty handling
echo ""
echo "AC8: Ground truth graceful handling"
if [ -f "$WORKFLOW_DIR/instructions.xml" ]; then
  grep -q "Ground truth not available" "$WORKFLOW_DIR/instructions.xml" && pass "Missing ground truth message present" || fail "Missing ground truth message NOT found"
else
  fail "instructions.xml not found"
fi

# AC10: No-claims edge case
echo ""
echo "AC10: No-claims edge case"
if [ -f "$WORKFLOW_DIR/instructions.xml" ]; then
  grep -q "No factual claims" "$WORKFLOW_DIR/instructions.xml" && pass "No-claims message present" || fail "No-claims message NOT found"
else
  fail "instructions.xml not found"
fi

# AC11: Discussion loop has template-output
echo ""
echo "AC11: Discussion loop template-output"
if [ -f "$WORKFLOW_DIR/instructions.xml" ]; then
  grep -q "template-output" "$WORKFLOW_DIR/instructions.xml" && pass "template-output tag present" || fail "template-output tag NOT found"
else
  fail "instructions.xml not found"
fi

# AC14: workflow-manifest.csv entry
echo ""
echo "AC14: workflow-manifest.csv entry"
if [ -f "$MANIFEST" ]; then
  grep -q "val-validate-artifact" "$MANIFEST" && pass "val-validate-artifact in manifest" || fail "val-validate-artifact NOT in manifest"
else
  fail "workflow-manifest.csv not found"
fi

# AC15: model_override opus
echo ""
echo "AC15: model_override opus (covered in AC2)"

# Summary
echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
exit $FAIL
