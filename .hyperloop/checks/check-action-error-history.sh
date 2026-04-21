#!/usr/bin/env bash
# check-action-error-history.sh — detect repeated orchestrator action-error loops.
#
# When the orchestrator's merge/apply action fails after 3 attempts it records
# "Action error after 3 attempts" as the round's review.  If two or more
# consecutive rounds carry that phrase, the task is stuck in an unresolvable
# loop: every fresh automated attempt will fail for exactly the same reason.
# This check detects that pattern early so the implementer can escalate to
# BLOCKED before burning another retry slot.
#
# Usage: TASK_ID=<id> bash .hyperloop/checks/check-action-error-history.sh
#
# Exits 0: fewer than 2 consecutive action-error rounds found.
# Exits 1: 2+ consecutive rounds are action errors → report BLOCKED immediately.

set -uo pipefail

TASK_ID="${TASK_ID:-}"
if [[ -z "$TASK_ID" ]]; then
  echo "ERROR: TASK_ID is not set.  Run as: TASK_ID=<id> bash $0" >&2
  exit 1
fi

REVIEWS_DIR=".hyperloop/state/reviews"
if [[ ! -d "$REVIEWS_DIR" ]]; then
  echo "OK: Reviews directory not found — skipping action-error history check."
  exit 0
fi

# Collect round numbers for this task, sorted descending, check the last 5.
LAST_ROUNDS=$(ls "$REVIEWS_DIR/${TASK_ID}-round-"*.md 2>/dev/null \
  | sed "s|.*${TASK_ID}-round-||;s|\.md$||" \
  | sort -n -r \
  | head -5)

if [[ -z "$LAST_ROUNDS" ]]; then
  echo "OK: No prior reviews found for ${TASK_ID} — skipping action-error history check."
  exit 0
fi

STREAK=0
for ROUND in $LAST_ROUNDS; do
  REVIEW_FILE="${REVIEWS_DIR}/${TASK_ID}-round-${ROUND}.md"
  if grep -q "Action error after" "$REVIEW_FILE" 2>/dev/null; then
    STREAK=$((STREAK + 1))
  else
    break   # stop at the first non-error round (measure consecutive streak only)
  fi
done

if [[ "$STREAK" -ge 2 ]]; then
  echo "" >&2
  echo "ERROR: Repeated action-error loop detected." >&2
  echo "  The last ${STREAK} consecutive reviews for '${TASK_ID}' all contain" >&2
  echo "  'Action error after N attempts' — automated retry is futile." >&2
  echo "" >&2
  echo "  REQUIRED ACTION (perform NO git operations):" >&2
  echo "    1. Run:  bash .hyperloop/checks/check-rebase-diagnostics.sh" >&2
  echo "    2. Paste the full output verbatim under a 'Rebase Diagnostics' heading." >&2
  echo "    3. Report this task as BLOCKED — human intervention required." >&2
  echo "" >&2
  echo "  Attempting another rebase or push will produce the identical error." >&2
  exit 1
fi

echo "OK: No action-error loop detected for ${TASK_ID} (consecutive error streak: ${STREAK})."
exit 0
