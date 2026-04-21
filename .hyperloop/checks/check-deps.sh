#!/usr/bin/env bash
# check-deps.sh
# Verifies that every dependency listed in the task file has status: done.
# Blocks implementers from starting and verifiers from approving if deps are unmet.
#
# Usage: TASK_ID=task-012 bash check-deps.sh
# Exit 0 = pass, non-zero = fail (blocker)

set -euo pipefail

: "${TASK_ID:?TASK_ID env var required (e.g. task-012)}"

TASK_FILE=".hyperloop/state/tasks/${TASK_ID}.md"

if [[ ! -f "$TASK_FILE" ]]; then
  echo "ERROR: Task file not found: $TASK_FILE" >&2
  exit 1
fi

# Extract deps list (YAML list items under "deps:")
DEPS=$(awk '/^deps:/{found=1; next} found && /^- /{print $2} found && /^[^- ]/{found=0}' "$TASK_FILE")

if [[ -z "$DEPS" ]]; then
  echo "PASS: No dependencies declared for $TASK_ID"
  exit 0
fi

FAILURES=0
while IFS= read -r dep; do
  dep=$(echo "$dep" | tr -d '[:space:]')
  [[ -z "$dep" ]] && continue
  dep_file=".hyperloop/state/tasks/${dep}.md"
  if [[ ! -f "$dep_file" ]]; then
    echo "FAIL: Dependency '$dep' has no task file at $dep_file" >&2
    FAILURES=$((FAILURES + 1))
    continue
  fi
  status=$(grep -m1 '^status:' "$dep_file" | sed 's/status:[[:space:]]*//')
  if [[ "$status" != "done" ]]; then
    echo "BLOCKER: Dependency '$dep' has status '$status' (must be 'done')" >&2
    FAILURES=$((FAILURES + 1))
  else
    echo "OK: Dependency '$dep' is done"
  fi
done <<< "$DEPS"

if [[ $FAILURES -gt 0 ]]; then
  echo ""
  echo "FAIL: $FAILURES unmet dependency/dependencies. Do not proceed until all deps are done." >&2
  exit 1
fi

echo "PASS: All dependencies are done"
