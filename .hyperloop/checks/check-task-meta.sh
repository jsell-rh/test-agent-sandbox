#!/usr/bin/env bash
# check-task-meta.sh — read and print key front-matter fields from a task file.
#
# Usage: TASK_ID=task-012 bash .hyperloop/checks/check-task-meta.sh
#
# Prints the id, title, status, phase, round, and deps fields extracted directly
# from the task file. Paste this output verbatim into your report as proof the
# correct task file was read.
#
# Exits 0 when the task file is found and parseable.
# Exits 1 when the task file is missing or the id field does not match TASK_ID.
set -euo pipefail

TASK_ID="${TASK_ID:?TASK_ID environment variable is required}"
TASK_FILE=".hyperloop/state/tasks/${TASK_ID}.md"

if [[ ! -f "$TASK_FILE" ]]; then
  echo "ERROR: Task file not found: ${TASK_FILE}" >&2
  exit 1
fi

# Extract scalar fields from YAML front-matter (lines between --- delimiters).
extract_field() {
  local field="$1"
  awk -v f="$field" '
    /^---$/ { delim++; next }
    delim == 1 && $0 ~ "^" f ": " { sub("^" f ": ", ""); print; found=1 }
    delim == 2 { exit }
    END { if (!found) print "(not set)" }
  ' "$TASK_FILE"
}

# Extract list items under a YAML key (e.g. deps).
extract_list() {
  local field="$1"
  awk -v f="$field" '
    /^---$/ { delim++ }
    delim == 1 && /^'"$field"':/ { capturing=1; next }
    capturing && /^- / { print "  " $2 }
    capturing && !/^- / && !/^$/ { capturing=0 }
    delim == 2 { exit }
  ' "$TASK_FILE"
}

id_val=$(extract_field "id")

# Verify the file id matches the requested TASK_ID to catch stale/wrong files.
if [[ "$id_val" != "$TASK_ID" ]]; then
  echo "ERROR: File id '${id_val}' does not match requested TASK_ID '${TASK_ID}'" >&2
  exit 1
fi

echo "Task metadata for ${TASK_ID}:"
echo "  id:     $(extract_field 'id')"
echo "  title:  $(extract_field 'title')"
echo "  status: $(extract_field 'status')"
echo "  phase:  $(extract_field 'phase')"
echo "  round:  $(extract_field 'round')"
deps=$(extract_list "deps")
if [[ -n "$deps" ]]; then
  echo "  deps:"
  echo "$deps"
else
  echo "  deps:   (none)"
fi
exit 0
