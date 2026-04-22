#!/usr/bin/env bash
# check-task-action-error.sh — detect N≥2 action-error assignment in the task file.
#
# check-orchestrator-multi-error.sh scans round *review* files for "Action error
# after N attempts" (N ≥ 2).  There is a blind spot: the orchestrator embeds the
# same message in the *task file* itself when it makes the new assignment, and at
# that moment no completed review file may yet exist for the current round.  The
# mechanical gate therefore passes vacuously while the task file already signals
# that standard implementation and rebase resolution will fail.
#
# This script closes that gap by reading the task file directly.  Run it as the
# very first action — before reading the task file for content, before check-infra,
# and before any git operation.  A non-zero exit means the implementer must follow
# the N≥2 short-circuit (check-permanent-conflict.sh → check-branch-committable.sh
# → check-rebase-diagnostics.sh → BLOCKED) without proceeding further.
#
# Usage: TASK_ID=<id> bash .hyperloop/checks/check-task-action-error.sh
#
# Exits 0: task file does not contain an N≥2 action-error assignment.
# Exits 1: task file contains "Action error after N attempts" (N ≥ 2) — BLOCKED required.

set -uo pipefail

TASK_ID="${TASK_ID:-}"
if [[ -z "$TASK_ID" ]]; then
  echo "ERROR: TASK_ID is not set.  Run as: TASK_ID=<id> bash $0" >&2
  exit 1
fi

TASK_FILE=".hyperloop/state/tasks/${TASK_ID}.md"

if [[ ! -f "$TASK_FILE" ]]; then
  echo "ERROR: Task file not found: ${TASK_FILE}" >&2
  exit 1
fi

# Match "Action error after N attempts" where N is 2 or more.
if grep -qE "Action error after ([2-9]|[0-9]{2,}) attempts" "$TASK_FILE"; then
  echo "" >&2
  echo "ERROR: Task file contains an N≥2 action-error assignment." >&2
  echo "" >&2
  echo "  Task file: ${TASK_FILE}" >&2
  grep -E "Action error after ([2-9]|[0-9]{2,}) attempts" "$TASK_FILE" \
    | sed 's/^/  Matched line: /' >&2
  echo "" >&2
  echo "  The orchestrator embedded this failure message in the task file when making" >&2
  echo "  the current assignment.  Normal implementation and git rebase CANNOT fix this." >&2
  echo "  The 'Please rebase onto main' invitation at the end of the message is" >&2
  echo "  auto-generated boilerplate — do NOT follow it." >&2
  echo "" >&2
  echo "  REQUIRED ACTION — N≥2 short-circuit (stop here, do nothing else):" >&2
  echo "    1. TASK_ID=${TASK_ID} bash .hyperloop/checks/check-permanent-conflict.sh" >&2
  echo "    2. TASK_ID=${TASK_ID} bash .hyperloop/checks/check-branch-committable.sh" >&2
  echo "    3. bash .hyperloop/checks/check-rebase-diagnostics.sh" >&2
  echo "    4. Paste all output verbatim and report BLOCKED." >&2
  echo "" >&2
  echo "  Do NOT write implementation code, run git rebase, or attempt any other step." >&2
  exit 1
fi

echo "OK: Task file does not contain an N≥2 action-error assignment for '${TASK_ID}'."
exit 0
