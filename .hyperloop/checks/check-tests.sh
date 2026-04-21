#!/usr/bin/env bash
# check-tests.sh
# Verifies that test files exist when the task or spec mandates TDD.
# Searches for *.test.* and *.spec.* files outside .hyperloop/ and specs/.
#
# Usage: TASK_ID=task-012 bash check-tests.sh
# Exit 0 = pass (tests found or TDD not required), non-zero = fail

set -euo pipefail

: "${TASK_ID:?TASK_ID env var required (e.g. task-012)}"

TASK_FILE=".hyperloop/state/tasks/${TASK_ID}.md"

if [[ ! -f "$TASK_FILE" ]]; then
  echo "ERROR: Task file not found: $TASK_FILE" >&2
  exit 1
fi

# Extract spec_ref path (strip @hash)
SPEC_REF=$(grep -m1 '^spec_ref:' "$TASK_FILE" | sed 's/spec_ref:[[:space:]]*//' | sed 's/@[a-f0-9]*//')
SPEC_FILE="${SPEC_REF:-}"

# Check whether TDD is mentioned in the task or the spec
TDD_REQUIRED=0
if grep -qi 'tdd\|test-driven\|tests first\|write.*test' "$TASK_FILE" 2>/dev/null; then
  TDD_REQUIRED=1
fi
if [[ -n "$SPEC_FILE" && -f "$SPEC_FILE" ]]; then
  if grep -qi 'tdd\|test-driven\|tests first\|write.*test\|vitest\|jest\|@nuxt/test' "$SPEC_FILE" 2>/dev/null; then
    TDD_REQUIRED=1
  fi
fi

if [[ $TDD_REQUIRED -eq 0 ]]; then
  echo "PASS: TDD not required for $TASK_ID — skipping test file check"
  exit 0
fi

echo "TDD is required — checking for test files..."

# Find test files, excluding .hyperloop/ and specs/ directories
TEST_FILES=$(find . \
  -not -path './.hyperloop/*' \
  -not -path './specs/*' \
  -not -path './.git/*' \
  \( -name '*.test.*' -o -name '*.spec.*' \) \
  -type f 2>/dev/null | grep -v '/specs/' || true)

if [[ -z "$TEST_FILES" ]]; then
  echo "FAIL: TDD is required but no test files (*.test.* or *.spec.*) were found in the repository." >&2
  exit 1
fi

COUNT=$(echo "$TEST_FILES" | wc -l | tr -d ' ')
echo "PASS: Found $COUNT test file(s):"
echo "$TEST_FILES" | sed 's/^/  /'
