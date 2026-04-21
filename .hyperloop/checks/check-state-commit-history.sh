#!/usr/bin/env bash
# check-state-commit-history.sh — verify no commit in the task branch history
# touches .hyperloop/state/ files.
#
# check-no-state-files.sh detects state files that differ in the FINAL tree
# (three-dot diff), but it cannot see intermediate commits. If a task-branch
# commit adds or modifies a state file, and a later commit restores the file to
# match main, the final-tree diff looks clean — but a rebase will conflict at
# the intermediate commit because the orchestrator also writes to those paths on
# main. The orchestrator replays commits one-by-one, so the conflict recurs on
# every apply attempt regardless of the final tree state.
#
# Usage: bash .hyperloop/checks/check-state-commit-history.sh
#
# Exits 0: no task-branch commit touches .hyperloop/state/
# Exits 1: one or more commits in the task-branch history touch state files.
set -uo pipefail

git fetch origin 2>/dev/null || echo "WARNING: git fetch failed; using cached origin/main."

if git rev-parse --verify origin/main >/dev/null 2>&1; then
  BASE="origin/main"
elif git rev-parse --verify main >/dev/null 2>&1; then
  BASE="main"
else
  echo "ERROR: Cannot find 'origin/main' or 'main' ref." >&2
  exit 1
fi

MERGE_BASE=$(git merge-base HEAD "$BASE" 2>/dev/null || true)
if [[ -z "$MERGE_BASE" ]]; then
  echo "WARNING: Could not determine merge base; skipping state-commit-history check."
  exit 0
fi

# Find commits between merge-base and HEAD that touch .hyperloop/state/.
# Using merge-base..HEAD scopes exactly to the task branch's own commits.
OFFENDING=$(git log --oneline "${MERGE_BASE}..HEAD" -- '.hyperloop/state/' 2>/dev/null || true)

if [[ -n "$OFFENDING" ]]; then
  echo "ERROR: One or more commits on this task branch touch .hyperloop/state/ files:" >&2
  echo "$OFFENDING" | sed 's/^/  /' >&2
  echo "" >&2
  echo "  Even when the final tree is clean, the orchestrator replays commits" >&2
  echo "  one-by-one during rebase. Each offending commit will conflict with" >&2
  echo "  main's state files, causing 'Action error after 3 attempts' every time." >&2
  echo "" >&2
  echo "  WARNING: A fixup commit does NOT fix this." >&2
  echo "  The orchestrator replays commits one-by-one; a fixup appended at the end" >&2
  echo "  does not prevent the conflict at the original bad commit during replay." >&2
  echo "" >&2
  echo "  Fix: Cherry-pick surgery — rebuild the branch without the state-file commits." >&2
  echo "  Run check-permanent-conflict.sh for guided surgery steps:" >&2
  echo "    TASK_ID=<id> bash .hyperloop/checks/check-permanent-conflict.sh" >&2
  echo "" >&2
  echo "  Manual steps:" >&2
  echo "    git fetch origin" >&2
  echo "    git checkout -b <branch-name>-surgery origin/main" >&2
  echo "    # identify implementation commits (exclude state-file commits):" >&2
  echo "    git log --oneline ${MERGE_BASE}..origin/<branch-name> -- ':!.hyperloop/state/'" >&2
  echo "    git cherry-pick <oldest-impl-sha> ... <newest-impl-sha>" >&2
  echo "    bash .hyperloop/checks/check-state-commit-history.sh  # must exit 0" >&2
  echo "    git push --force origin HEAD:<branch-name>" >&2
  exit 1
fi

echo "OK: No task-branch commit in history touches .hyperloop/state/ — safe for rebase."
exit 0
