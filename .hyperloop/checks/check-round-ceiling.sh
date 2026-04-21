#!/usr/bin/env bash
# check-round-ceiling.sh — detect high-round tasks with stale rebase state.
#
# A task that has been retried many times (round >= CEILING) while its branch
# still diverges from main will never be resolved automatically.  Each new
# attempt repeats the same rebase conflict and wastes a retry slot.  This
# check combines the task's round counter with rebase cleanliness to flag
# that condition so the implementer can escalate to BLOCKED before spending
# another round on a futile resolution attempt.
#
# Usage: TASK_ID=<id> bash .hyperloop/checks/check-round-ceiling.sh
#
# Exits 0: round is below ceiling, OR branch is already rebased onto main.
# Exits 1: round >= CEILING and branch diverges from main → escalate to BLOCKED.
#
# Run this check EARLY in your session, immediately after check-deps.sh,
# before any rebase or git operations.

set -uo pipefail

CEILING=10

TASK_ID="${TASK_ID:-}"
if [[ -z "$TASK_ID" ]]; then
  echo "ERROR: TASK_ID environment variable is not set." >&2
  echo "  Run as: TASK_ID=<task-id> bash .hyperloop/checks/check-round-ceiling.sh" >&2
  exit 1
fi

TASK_FILE=".hyperloop/state/tasks/${TASK_ID}.md"
if [[ ! -f "$TASK_FILE" ]]; then
  echo "ERROR: Task file not found: $TASK_FILE" >&2
  exit 1
fi

ROUND=$(grep '^round:' "$TASK_FILE" | awk '{print $2}' | tr -d '[:space:]')

if [[ -z "$ROUND" ]] || ! [[ "$ROUND" =~ ^[0-9]+$ ]]; then
  echo "WARNING: Could not parse 'round:' from $TASK_FILE (got: '${ROUND:-empty}'); skipping ceiling check."
  exit 0
fi

echo "Task round: $ROUND  (escalation ceiling: $CEILING)"

if [[ "$ROUND" -lt "$CEILING" ]]; then
  echo "OK: Round $ROUND is below the escalation ceiling — normal processing applies."
  exit 0
fi

echo "NOTICE: Task is on round $ROUND (>= $CEILING). Checking rebase cleanliness..."

# Fetch so the comparison is against the true latest main.
git fetch origin 2>/dev/null || echo "WARNING: git fetch failed; using cached origin/main."

if git rev-parse --verify origin/main >/dev/null 2>&1; then
  BASE="origin/main"
elif git rev-parse --verify main >/dev/null 2>&1; then
  BASE="main"
else
  echo "WARNING: Cannot locate a 'main' ref; skipping rebase cleanliness check."
  exit 0
fi

BASE_COMMIT=$(git rev-parse "$BASE")
HEAD_COMMIT=$(git rev-parse HEAD)

# HEAD already at (or behind) main — nothing diverges.
if [[ "$HEAD_COMMIT" == "$BASE_COMMIT" ]]; then
  echo "OK: HEAD is at $BASE — branch is clean at round $ROUND."
  exit 0
fi

MERGE_BASE=$(git merge-base HEAD "$BASE" 2>/dev/null || echo "")

if [[ -n "$MERGE_BASE" && "$MERGE_BASE" == "$BASE_COMMIT" ]]; then
  AHEAD=$(git rev-list "$BASE"..HEAD --count 2>/dev/null || echo "?")
  echo "OK: Branch is rebased onto $BASE ($AHEAD commit(s) ahead) at round $ROUND — no escalation needed."
  exit 0
fi

# Branch diverges from main AND round >= ceiling.
BEHIND=$(git rev-list HEAD.."$BASE" --count 2>/dev/null || echo "?")
echo "" >&2
echo "ERROR: Round-ceiling escalation triggered." >&2
echo "  Task '$TASK_ID' is on round $ROUND (>= $CEILING) AND the branch is" >&2
echo "  $BEHIND commit(s) behind $BASE." >&2
echo "" >&2
echo "  After $ROUND rounds the rebase conflict has not been resolved automatically." >&2
echo "  Continuing to attempt resolution will fail for the same reason." >&2
echo "" >&2
echo "  REQUIRED ACTION:" >&2
echo "    1. Run:  bash .hyperloop/checks/check-rebase-diagnostics.sh" >&2
echo "    2. Paste the full output verbatim under a 'Rebase Diagnostics' heading." >&2
echo "    3. Report this task as BLOCKED — do NOT attempt git rebase or git push." >&2
exit 1
