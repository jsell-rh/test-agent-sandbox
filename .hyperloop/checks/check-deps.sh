#!/usr/bin/env bash
# check-deps.sh — verify all declared dependencies for a task are `status: done`.
#
# Usage: TASK_ID=task-012 bash .hyperloop/checks/check-deps.sh
#
# Exits 0 when every dep is done (or the task has no deps).
# Exits 1 when any dep is not done or its file is missing.
set -euo pipefail

TASK_ID="${TASK_ID:?TASK_ID environment variable is required}"
TASK_FILE=".hyperloop/state/tasks/${TASK_ID}.md"

if [[ ! -f "$TASK_FILE" ]]; then
  echo "ERROR: Task file not found: ${TASK_FILE}" >&2
  exit 1
fi

# Extract list items under the `deps:` key.
# Stops at the next YAML key (a line that does NOT start with `- `).
deps=$(awk '
  /^deps:/ { capturing=1; next }
  capturing && /^- / { print $2 }
  capturing && !/^- / { capturing=0 }
' "$TASK_FILE")

if [[ -z "$deps" ]]; then
  echo "No dependencies declared for ${TASK_ID}. OK."
  exit 0
fi

all_ok=true
while IFS= read -r dep; do
  [[ -z "$dep" ]] && continue
  dep_file=".hyperloop/state/tasks/${dep}.md"
  if [[ ! -f "$dep_file" ]]; then
    echo "ERROR: Dependency task file not found: ${dep_file}" >&2
    all_ok=false
    continue
  fi
  dep_status=$(awk '/^status:/{print $2}' "$dep_file")
  if [[ "$dep_status" != "complete" ]]; then
    echo "BLOCKED: ${dep} has status='${dep_status}' (must be 'complete')" >&2
    all_ok=false
  else
    echo "OK: ${dep} is done"
  fi
done <<< "$deps"

if [[ "$all_ok" != "true" ]]; then
  exit 1
fi

echo "All dependencies satisfied for ${TASK_ID}."
exit 0
