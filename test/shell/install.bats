#!/usr/bin/env bats

# BATS tests for gaia-install.sh
# Run: bats test/shell/install.bats

SCRIPT="$BATS_TEST_DIRNAME/../../gaia-install.sh"

setup() {
  # Create a temp directory for each test
  TEST_DIR="$(mktemp -d)"
}

teardown() {
  # Clean up temp directory
  rm -rf "$TEST_DIR"
}

@test "installer script exists and is readable" {
  [ -f "$SCRIPT" ]
  [ -r "$SCRIPT" ]
}

@test "installer script is valid bash" {
  bash -n "$SCRIPT"
}

@test "installer shows usage with --help" {
  run bash "$SCRIPT" --help
  [ "$status" -eq 0 ]
  [[ "$output" == *"Usage"* ]] || [[ "$output" == *"usage"* ]] || [[ "$output" == *"GAIA"* ]]
}

@test "installer rejects unknown commands" {
  run bash "$SCRIPT" foobar "$TEST_DIR"
  [ "$status" -ne 0 ]
}

@test "validate command works on empty directory" {
  run bash "$SCRIPT" validate "$TEST_DIR"
  # Should fail because no framework installed
  [ "$status" -ne 0 ]
}
