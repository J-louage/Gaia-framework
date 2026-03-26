#!/usr/bin/env bash
# Performance Benchmark Shell Harness (E7-S5)
#
# Measures init and validate command wall-clock times using bash time builtin.
# Outputs JSON artifact with P95 calculations.
#
# Usage:
#   bash scripts/shell-benchmark.sh [--iterations N] [--output path]
#   bash scripts/shell-benchmark.sh --command init --iterations 5
#   bash scripts/shell-benchmark.sh --threshold-init 5000 --threshold-validate 2000
#
# Always exits 0 (soft gate — warnings only).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
INSTALLER="$PROJECT_ROOT/gaia-install.sh"

# Defaults
ITERATIONS=10
OUTPUT=""
COMMAND=""  # empty = run all
THRESHOLD_INIT=5000
THRESHOLD_VALIDATE=2000

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --iterations)       ITERATIONS="$2"; shift 2 ;;
    --output)           OUTPUT="$2"; shift 2 ;;
    --command)          COMMAND="$2"; shift 2 ;;
    --threshold-init)   THRESHOLD_INIT="$2"; shift 2 ;;
    --threshold-validate) THRESHOLD_VALIDATE="$2"; shift 2 ;;
    *) shift ;;
  esac
done

# Collect timings using bash time builtin
# Returns milliseconds as integer
measure_ms() {
  local cmd="$1"
  shift
  local start_ns end_ns duration_ms

  # Use date +%s%N if available (Linux), fallback to perl (macOS)
  if date +%s%N >/dev/null 2>&1 && [[ "$(date +%s%N)" != *N* ]]; then
    start_ns=$(date +%s%N)
    eval "$cmd" "$@" >/dev/null 2>&1 || true
    end_ns=$(date +%s%N)
    duration_ms=$(( (end_ns - start_ns) / 1000000 ))
  else
    # macOS fallback using perl for nanosecond precision
    start_ns=$(perl -MTime::HiRes=time -e 'printf "%d", time * 1000000000')
    eval "$cmd" "$@" >/dev/null 2>&1 || true
    end_ns=$(perl -MTime::HiRes=time -e 'printf "%d", time * 1000000000')
    duration_ms=$(( (end_ns - start_ns) / 1000000 ))
  fi

  echo "$duration_ms"
}

# Calculate P95 from a space-separated list of values
# P95 = value at index ceil(0.95 * N) - 1 in sorted array
calculate_p95() {
  local values="$1"
  local sorted
  sorted=$(echo "$values" | tr ' ' '\n' | sort -n)
  local count
  count=$(echo "$sorted" | wc -l | tr -d ' ')
  local idx
  idx=$(node -e "console.log(Math.ceil(0.95 * ${count}) - 1)")
  # 0-indexed: skip idx lines, take 1
  echo "$sorted" | sed -n "$((idx + 1))p"
}

# Build JSON array from space-separated values
to_json_array() {
  local values="$1"
  echo "$values" | tr ' ' '\n' | paste -sd',' - | sed 's/^/[/;s/$/]/'
}

# Run benchmarks
init_timings=""
validate_timings=""

run_init_bench() {
  local temp_dir
  for i in $(seq 1 "$ITERATIONS"); do
    temp_dir=$(mktemp -d)
    local ms
    ms=$(measure_ms "bash '$INSTALLER' init --source '$PROJECT_ROOT' --yes '$temp_dir'")
    init_timings="${init_timings:+$init_timings }$ms"
    rm -rf "$temp_dir"
  done
}

run_validate_bench() {
  for i in $(seq 1 "$ITERATIONS"); do
    local ms
    ms=$(measure_ms "bash '$INSTALLER' validate")
    validate_timings="${validate_timings:+$validate_timings }$ms"
  done
}

# Execute requested benchmarks
if [[ -z "$COMMAND" || "$COMMAND" == "init" ]]; then
  run_init_bench
fi

if [[ -z "$COMMAND" || "$COMMAND" == "validate" ]]; then
  run_validate_bench
fi

# Calculate P95 values
init_p95=""
validate_p95=""

if [[ -n "$init_timings" ]]; then
  init_p95=$(calculate_p95 "$init_timings")
fi

if [[ -n "$validate_timings" ]]; then
  validate_p95=$(calculate_p95 "$validate_timings")
fi

# Detect runner type
runner_type="${RUNNER_OS:-$(uname -s)}"
node_version="$(node --version 2>/dev/null || echo 'unknown')"
timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Build JSON output
build_json() {
  local benchmarks_json=""

  if [[ -n "$init_timings" ]]; then
    local init_arr
    init_arr=$(to_json_array "$init_timings")
    local init_status="pass"
    if [[ -n "$init_p95" ]] && [[ "$init_p95" -gt "$THRESHOLD_INIT" ]]; then
      init_status="warn"
    fi
    benchmarks_json="\"init\": { \"timings\": $init_arr, \"p95\": $init_p95, \"threshold\": $THRESHOLD_INIT, \"status\": \"$init_status\" }"
  fi

  if [[ -n "$validate_timings" ]]; then
    local val_arr
    val_arr=$(to_json_array "$validate_timings")
    local val_status="pass"
    if [[ -n "$validate_p95" ]] && [[ "$validate_p95" -gt "$THRESHOLD_VALIDATE" ]]; then
      val_status="warn"
    fi
    if [[ -n "$benchmarks_json" ]]; then
      benchmarks_json="$benchmarks_json, "
    fi
    benchmarks_json="${benchmarks_json}\"validate\": { \"timings\": $val_arr, \"p95\": $validate_p95, \"threshold\": $THRESHOLD_VALIDATE, \"status\": \"$val_status\" }"
  fi

  cat <<ENDJSON
{
  "metadata": {
    "runner_type": "$runner_type",
    "node_version": "$node_version",
    "timestamp": "$timestamp",
    "iterations": $ITERATIONS
  },
  "benchmarks": {
    $benchmarks_json
  }
}
ENDJSON
}

json_output=$(build_json)

# Write to file if output specified
if [[ -n "$OUTPUT" ]]; then
  mkdir -p "$(dirname "$OUTPUT")"
  echo "$json_output" > "$OUTPUT"
fi

# Print summary
echo ""
echo "=== Shell Benchmark Results ==="
echo ""
if [[ -n "$init_p95" ]]; then
  local_status="PASS"
  if [[ "$init_p95" -gt "$THRESHOLD_INIT" ]]; then
    local_status="WARN"
    echo "::warning::Performance threshold breached: init P95=${init_p95}ms exceeds ${THRESHOLD_INIT}ms"
  fi
  echo "init      | P95=${init_p95}ms | threshold=${THRESHOLD_INIT}ms | $local_status"
fi

if [[ -n "$validate_p95" ]]; then
  local_status="PASS"
  if [[ "$validate_p95" -gt "$THRESHOLD_VALIDATE" ]]; then
    local_status="WARN"
    echo "::warning::Performance threshold breached: validate P95=${validate_p95}ms exceeds ${THRESHOLD_VALIDATE}ms"
  fi
  echo "validate  | P95=${validate_p95}ms | threshold=${THRESHOLD_VALIDATE}ms | $local_status"
fi

echo ""
echo "Runner: $runner_type | Node: $node_version"
if [[ -n "$OUTPUT" ]]; then
  echo "Results written to: $OUTPUT"
fi

# Always exit 0 — soft gate (AC5)
exit 0
