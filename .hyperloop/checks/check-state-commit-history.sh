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
  echo "  Fix: Add a fixup commit that fully removes any state-file changes:" >&2
  echo "    git fetch origin" >&2
  echo "    git checkout origin/main -- .hyperloop/state/" >&2
  echo "    git add .hyperloop/state/" >&2
  echo "    git commit -m 'fix: restore state files to match main (remove from task branch)'" >&2
  echo "  Then re-run all checks including check-no-state-files.sh." >&2
  echo "" >&2
  echo "  Alternatively, use 'git rebase -i ${MERGE_BASE}' to drop or squash" >&2
  echo "  the offending commit's state-file hunks before the push." >&2
  exit 1
fi

echo "OK: No task-branch commit in history touches .hyperloop/state/ — safe for rebase."
exit 0
