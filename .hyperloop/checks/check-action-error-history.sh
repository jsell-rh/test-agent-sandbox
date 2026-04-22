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
# IMPORTANT: review files are committed to main by the orchestrator, not to the
# task branch.  When the task branch has not yet been rebased, local filesystem
# access cannot see those files.  This script therefore checks BOTH the local
# filesystem AND origin/main directly so the gate is never bypassed by a stale
# local tree.
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

# Fetch so origin/main reflects the latest orchestrator writes.
echo "Fetching origin to ensure review files from origin/main are current..."
git fetch origin 2>/dev/null || echo "WARNING: git fetch failed; using cached origin/main."

# --- Collect all round numbers for this task from BOTH local tree and origin/main ---

# Pass 1: local filesystem (works when task branch is rebased onto main).
LOCAL_ROUNDS=""
if [[ -d "$REVIEWS_DIR" ]]; then
  LOCAL_ROUNDS=$(ls "${REVIEWS_DIR}/${TASK_ID}-round-"*.md 2>/dev/null \
    | sed "s|.*${TASK_ID}-round-||;s|\.md$||" || true)
fi

# Pass 2: origin/main directly (catches files absent from the local tree).
# Review files live on main; if the branch hasn't been rebased they won't appear
# in the local working tree.  Reading via "git ls-tree" bypasses this blind spot.
ORIGIN_ROUNDS=""
if git rev-parse --verify origin/main >/dev/null 2>&1; then
  ORIGIN_ROUNDS=$(git ls-tree -r --name-only origin/main 2>/dev/null \
    | grep -E "^${REVIEWS_DIR}/${TASK_ID}-round-[0-9]+\.md$" \
    | sed "s|.*${TASK_ID}-round-||;s|\.md$||" || true)
fi

# Merge, deduplicate, sort descending, take the last 5 to check streak.
ALL_ROUNDS=$(printf '%s\n' "$LOCAL_ROUNDS" "$ORIGIN_ROUNDS" \
  | sort -nu | grep -v '^[[:space:]]*$' | sort -n -r | head -5 || true)

if [[ -z "$ALL_ROUNDS" ]]; then
  echo "OK: No prior reviews found for ${TASK_ID} — skipping action-error history check."
  exit 0
fi

# --- Check consecutive streak of action-error rounds ---

STREAK=0
for ROUND in $ALL_ROUNDS; do
  REVIEW_FILE="${REVIEWS_DIR}/${TASK_ID}-round-${ROUND}.md"

  # Prefer local file; fall back to reading from origin/main.
  CONTENT=""
  if [[ -f "$REVIEW_FILE" ]]; then
    CONTENT=$(cat "$REVIEW_FILE" 2>/dev/null || true)
  elif git rev-parse --verify origin/main >/dev/null 2>&1; then
    CONTENT=$(git show "origin/main:${REVIEW_FILE}" 2>/dev/null || true)
  fi

  if echo "$CONTENT" | grep -q "Action error after"; then
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
  echo "  REQUIRED ACTION:" >&2
  echo "    1. Run:  bash .hyperloop/checks/check-rebase-diagnostics.sh" >&2
  echo "       Paste its full output verbatim under a 'Rebase Diagnostics' heading." >&2
  echo "    2. Ensure branch is committable BEFORE reporting BLOCKED:" >&2
  echo "       TASK_ID=${TASK_ID} bash .hyperloop/checks/check-branch-committable.sh" >&2
  echo "       If it exits non-zero, apply the bare-branch emergency fallback:" >&2
  echo "         BRANCH=\$(git rev-parse --abbrev-ref HEAD)" >&2
  echo "         git fetch origin" >&2
  echo "         git push --force origin origin/main:refs/heads/\$BRANCH" >&2
  echo "         bash .hyperloop/checks/check-push-sync.sh" >&2
  echo "       Re-run check-branch-committable.sh until it exits 0." >&2
  echo "    3. Report this task as BLOCKED — human intervention required." >&2
  echo "" >&2
  echo "  DO NOT attempt git rebase, cherry-pick, or any implementation work." >&2
  echo "  Only the branch-committability steps above (bare-branch fallback) are permitted." >&2
  echo "  The orchestrator applies the task branch before recording ANY verdict including" >&2
  echo "  BLOCKED — skipping step 2 reproduces 'Action error after 3 attempts' forever." >&2
  exit 1
fi

echo "OK: No action-error loop detected for ${TASK_ID} (consecutive error streak: ${STREAK})."
exit 0
