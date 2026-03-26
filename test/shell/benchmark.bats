#!/usr/bin/env bats

# BATS tests for performance regression benchmarks (E7-S5)
# Measures init and validate command P95 latencies via shell timing.
#
# Covers: AC1 (benchmark execution), AC3 (init <5s P95),
#         AC4 (validate <2s P95), AC5 (soft gate — always exit 0)
#
# Run: bats test/shell/benchmark.bats

SCRIPT="$BATS_TEST_DIRNAME/../../gaia-install.sh"
BENCH_SCRIPT="$BATS_TEST_DIRNAME/../../scripts/shell-benchmark.sh"

setup() {
  TEST_DIR="$(mktemp -d)"
}

teardown() {
  rm -rf "$TEST_DIR"
}

# ─── Shell benchmark script existence (prerequisite) ─────────────────────────

@test "E7-S5: shell-benchmark.sh exists and is executable" {
  [ -f "$BENCH_SCRIPT" ]
  [ -x "$BENCH_SCRIPT" ]
}

# ─── AC1: Benchmark execution produces JSON output ───────────────────────────

@test "E7-S5: shell-benchmark.sh produces JSON output" {
  run bash "$BENCH_SCRIPT" --iterations 1 --output "$TEST_DIR/bench-results.json"
  [ "$status" -eq 0 ]
  [ -f "$TEST_DIR/bench-results.json" ]
  # Verify it contains valid JSON (use node for parsing)
  run node -e "JSON.parse(require('fs').readFileSync('$TEST_DIR/bench-results.json', 'utf8')); console.log('valid')"
  [ "$output" = "valid" ]
}

# ─── AC3: Init benchmark timing ─────────────────────────────────────────────

@test "E7-S5: shell-benchmark.sh measures init command timing" {
  run bash "$BENCH_SCRIPT" --command init --iterations 1 --output "$TEST_DIR/bench-results.json"
  [ "$status" -eq 0 ]
  # JSON should contain init timings
  run node -e "const d=JSON.parse(require('fs').readFileSync('$TEST_DIR/bench-results.json','utf8')); console.log(d.benchmarks.init ? 'has-init' : 'no-init')"
  [ "$output" = "has-init" ]
}

# ─── AC4: Validate benchmark timing ─────────────────────────────────────────

@test "E7-S5: shell-benchmark.sh measures validate command timing" {
  run bash "$BENCH_SCRIPT" --command validate --iterations 1 --output "$TEST_DIR/bench-results.json"
  [ "$status" -eq 0 ]
  # JSON should contain validate timings
  run node -e "const d=JSON.parse(require('fs').readFileSync('$TEST_DIR/bench-results.json','utf8')); console.log(d.benchmarks.validate ? 'has-validate' : 'no-validate')"
  [ "$output" = "has-validate" ]
}

# ─── AC5: Soft gate — always exit 0 ─────────────────────────────────────────

@test "E7-S5: shell-benchmark.sh exits 0 even if thresholds are breached" {
  # Even with impossible thresholds (1ms), the script should exit 0
  run bash "$BENCH_SCRIPT" --iterations 1 --threshold-init 1 --threshold-validate 1 --output "$TEST_DIR/bench-results.json"
  [ "$status" -eq 0 ]
}

# ─── AC6: Runner metadata captured ──────────────────────────────────────────

@test "E7-S5: shell-benchmark.sh captures runner type in JSON" {
  run bash "$BENCH_SCRIPT" --iterations 1 --output "$TEST_DIR/bench-results.json"
  [ "$status" -eq 0 ]
  run node -e "const d=JSON.parse(require('fs').readFileSync('$TEST_DIR/bench-results.json','utf8')); console.log(d.metadata.runner_type ? 'has-runner' : 'no-runner')"
  [ "$output" = "has-runner" ]
}

@test "E7-S5: shell-benchmark.sh captures Node.js version in JSON" {
  run bash "$BENCH_SCRIPT" --iterations 1 --output "$TEST_DIR/bench-results.json"
  [ "$status" -eq 0 ]
  run node -e "const d=JSON.parse(require('fs').readFileSync('$TEST_DIR/bench-results.json','utf8')); console.log(d.metadata.node_version ? 'has-node' : 'no-node')"
  [ "$output" = "has-node" ]
}
