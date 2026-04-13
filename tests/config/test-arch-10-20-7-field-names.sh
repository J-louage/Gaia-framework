#!/usr/bin/env bash
# Test script for E17-S18: Update architecture §10.20.7 field names to match bridge code
# Validates all 5 acceptance criteria.

set -uo pipefail

PROJECT_ROOT="/Users/jlouage/Dev/GAIA-Framework"
ARCH_FILE="$PROJECT_ROOT/docs/planning-artifacts/architecture.md"

PASS=0
FAIL=0

assert() {
  local desc="$1" result="$2"
  if [ "$result" = "true" ]; then
    echo "  PASS: $desc"
    ((PASS++))
  else
    echo "  FAIL: $desc"
    ((FAIL++))
  fi
}

echo "=== E17-S18 Architecture §10.20.7 Field Name Tests ==="

# --- Extract §10.20.7 content (between "#### 10.20.7" and "#### 10.20.8") ---
SECTION=$(awk '/^#### 10\.20\.7/{found=1} found && /^#### 10\.20\.8/{exit} found{print}' "$ARCH_FILE")

# --- AC1: test_execution_bridge replaces test_execution ---
echo ""
echo "--- AC1: Config block uses test_execution_bridge ---"

# The old legacy name (test_execution without _bridge suffix) should NOT appear in §10.20.7
LEGACY_HITS=$(echo "$SECTION" | grep -c 'test_execution[^_]' || true)
assert "No legacy 'test_execution' (without _bridge) in §10.20.7" "$([ "$LEGACY_HITS" -eq 0 ] && echo true || echo false)"

# The new name should appear
NEW_NAME_HITS=$(echo "$SECTION" | grep -c 'test_execution_bridge' || true)
assert "'test_execution_bridge' appears in §10.20.7" "$([ "$NEW_NAME_HITS" -gt 0 ] && echo true || echo false)"

# --- AC2: timeout_seconds replaces evidence_required ---
echo ""
echo "--- AC2: timeout_seconds replaces evidence_required ---"

EVIDENCE_HITS=$(echo "$SECTION" | grep -c 'evidence_required' || true)
assert "No 'evidence_required' in §10.20.7" "$([ "$EVIDENCE_HITS" -eq 0 ] && echo true || echo false)"

TIMEOUT_HITS=$(echo "$SECTION" | grep -c 'timeout_seconds' || true)
assert "'timeout_seconds' appears in §10.20.7" "$([ "$TIMEOUT_HITS" -gt 0 ] && echo true || echo false)"

# --- AC3: YAML example uses exact field names from code ---
echo ""
echo "--- AC3: YAML example matches code field names ---"

YAML_BLOCK=$(echo "$SECTION" | sed -n '/^```yaml/,/^```/p')
assert "YAML block contains 'test_execution_bridge:'" "$(echo "$YAML_BLOCK" | grep -q 'test_execution_bridge:' && echo true || echo false)"
assert "YAML block contains 'timeout_seconds:'" "$(echo "$YAML_BLOCK" | grep -q 'timeout_seconds:' && echo true || echo false)"
assert "YAML block contains 'bridge_enabled:'" "$(echo "$YAML_BLOCK" | grep -q 'bridge_enabled:' && echo true || echo false)"

# --- AC4: No files outside architecture.md changed ---
echo ""
echo "--- AC4: No-code-change constraint ---"

# This test validates that only architecture.md is in the diff
CHANGED_FILES=$(cd "$PROJECT_ROOT" && git diff --name-only HEAD 2>/dev/null || echo "")
# Filter out non-architecture.md files (allow story file and sprint files which are expected)
NON_DOC_CHANGES=$(echo "$CHANGED_FILES" | grep -v '^docs/' | grep -v '^$' || true)
assert "No non-docs files changed" "$([ -z "$NON_DOC_CHANGES" ] && echo true || echo false)"

# --- AC5: FR-202 row references test_execution_bridge ---
echo ""
echo "--- AC5: Addresses table FR-202 row updated ---"

FR202_LINE=$(grep 'FR-202' "$ARCH_FILE" || true)
assert "FR-202 row references 'test_execution_bridge'" "$(echo "$FR202_LINE" | grep -q 'test_execution_bridge' && echo true || echo false)"
assert "FR-202 row does NOT reference legacy 'test_execution config block'" "$(echo "$FR202_LINE" | grep -qv 'test_execution config block' && echo true || echo false)"

# --- Summary ---
echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="

if [ "$FAIL" -gt 0 ]; then
  exit 1
else
  exit 0
fi
