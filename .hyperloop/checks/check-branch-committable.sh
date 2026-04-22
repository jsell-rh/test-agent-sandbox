#!/usr/bin/env bash
# check-branch-committable.sh — verify the task branch is in a state the
# orchestrator can apply to main (no state files in history, no merge conflicts).
#
# The orchestrator applies the task branch to main before recording ANY verdict,
# including BLOCKED verdicts.  If the branch has state files in its commit
# history or content conflicts with main, the apply fails with
# "Action error after 3 attempts" — even for BLOCKED reports — perpetuating
# the loop indefinitely.
#
# Run this script AFTER cherry-pick surgery or bare-branch fallback, and BEFORE
# writing the BLOCKED report.  A non-zero exit means the branch is still broken;
# take the bare-branch emergency fallback before reporting.
#
# Usage: TASK_ID=<id> bash .hyperloop/checks/check-branch-committable.sh
#
# Exits 0: branch is committable (clean history, rebased onto main, no conflicts).
# Exits 1: branch is NOT committable — orchestrator apply will fail.

set -uo pipefail

TASK_ID="${TASK_ID:-}"
if [[ -z "$TASK_ID" ]]; then
  echo "ERROR: TASK_ID is not set.  Run as: TASK_ID=<id> bash $0" >&2
  exit 1
fi

echo "Fetching origin..."
git fetch origin 2>/dev/null || echo "WARNING: git fetch failed; using cached origin/main."

FAIL=0

# ── Gate 1: rebase cleanliness ────────────────────────────────────────────────
if git rev-parse --verify origin/main >/dev/null 2>&1; then
  BASE="origin/main"
elif git rev-parse --verify main >/dev/null 2>&1; then
  BASE="main"
else
  echo "WARNING: Cannot locate main ref; skipping rebase check." >&2
  BASE=""
fi

if [[ -n "$BASE" ]]; then
  BASE_COMMIT=$(git rev-parse "$BASE")
  HEAD_COMMIT=$(git rev-parse HEAD)
  MERGE_BASE=$(git merge-base HEAD "$BASE" 2>/dev/null || true)

  if [[ -z "$MERGE_BASE" ]]; then
    echo "ERROR: No common ancestor with $BASE — branch is not committable." >&2
    FAIL=1
  elif [[ "$MERGE_BASE" != "$BASE_COMMIT" ]]; then
    BEHIND=$(git rev-list HEAD.."$BASE" --count 2>/dev/null || echo "?")
    echo "ERROR: Branch is $BEHIND commit(s) behind $BASE — not rebased onto main." >&2
    echo "  Run the cherry-pick surgery or bare-branch fallback before reporting BLOCKED." >&2
    FAIL=1
  else
    AHEAD=$(git rev-list "$BASE"..HEAD --count 2>/dev/null || echo "?")
    echo "OK: Branch is rebased onto $BASE ($AHEAD commit(s) ahead)."
  fi
fi

# ── Gate 2: no state files in commit history ──────────────────────────────────
if [[ -n "${MERGE_BASE:-}" ]]; then
  STATE_COMMITS=$(git log --oneline "${MERGE_BASE}..HEAD" -- '.hyperloop/state/' \
    2>/dev/null || true)
  if [[ -n "$STATE_COMMITS" ]]; then
    echo "ERROR: State files found in task-branch commit history:" >&2
    echo "$STATE_COMMITS" | sed 's/^/  /' >&2
    echo "  The orchestrator replays commits one-by-one; it will conflict at the" >&2
    echo "  offending commit regardless of what the final tree looks like." >&2
    echo "  Run cherry-pick surgery or bare-branch fallback before reporting BLOCKED." >&2
    FAIL=1
  else
    echo "OK: No state files in commit history."
  fi
fi

# ── Gate 3: no merge-tree content conflicts ───────────────────────────────────
if [[ -n "${BASE:-}" && -n "${MERGE_BASE:-}" ]]; then
  BASE_COMMIT=$(git rev-parse "$BASE")
  HEAD_COMMIT=$(git rev-parse HEAD)
  MERGE_OUT=$(git merge-tree "$MERGE_BASE" "$BASE_COMMIT" "$HEAD_COMMIT" 2>&1 || true)
  if echo "$MERGE_OUT" | grep -qE '(<<<<<<<|>>>>>>>)' 2>/dev/null; then
    echo "ERROR: Merge-tree simulation shows content conflicts:" >&2
    echo "$MERGE_OUT" | grep -E -A 4 -B 1 '(<<<<<<<|>>>>>>>)' | head -40 | sed 's/^/  /' >&2
    echo "  The orchestrator apply will fail.  Run surgery or bare-branch fallback." >&2
    FAIL=1
  else
    echo "OK: No content conflicts in merge-tree simulation."
  fi
fi

if [[ "$FAIL" -ne 0 ]]; then
  echo "" >&2
  echo "BRANCH IS NOT COMMITTABLE — orchestrator apply WILL fail with 'Action error'." >&2
  echo "" >&2
  echo "  Emergency bare-branch fallback:" >&2
  echo "    BRANCH=\$(git rev-parse --abbrev-ref HEAD)" >&2
  echo "    git fetch origin" >&2
  echo "    git push --force origin origin/main:refs/heads/\$BRANCH" >&2
  echo "    bash .hyperloop/checks/check-push-sync.sh" >&2
  echo "" >&2
  echo "  Then re-run this check and confirm it exits 0 before reporting BLOCKED." >&2
  exit 1
fi

echo "OK: Branch is committable — orchestrator apply should succeed."
exit 0
