#!/usr/bin/env bash
# check-rebase-state.sh — fail if git is currently mid-rebase.
#
# A branch submitted while a rebase is in progress (.git/rebase-merge or
# .git/rebase-apply exists) will always conflict when the orchestrator applies
# it.  This check catches that broken state before submission so it is never
# sent upstream.
#
# Usage: bash .hyperloop/checks/check-rebase-state.sh
#
# Exits 0 when no rebase is in progress.
# Exits 1 when git is mid-rebase and action is required.
set -euo pipefail

GIT_DIR=$(git rev-parse --git-dir 2>/dev/null) || {
  echo "ERROR: Not inside a git repository." >&2
  exit 1
}

IN_PROGRESS=false

if [[ -d "${GIT_DIR}/rebase-merge" ]]; then
  STEP_FILE="${GIT_DIR}/rebase-merge/msgnum"
  LAST_FILE="${GIT_DIR}/rebase-merge/end"
  STEP=$( [[ -f "$STEP_FILE" ]] && cat "$STEP_FILE" || echo "?")
  LAST=$( [[ -f "$LAST_FILE" ]] && cat "$LAST_FILE" || echo "?")
  echo "ERROR: Interactive/merge rebase is in progress (step ${STEP}/${LAST})." >&2
  IN_PROGRESS=true
fi

if [[ -d "${GIT_DIR}/rebase-apply" ]]; then
  echo "ERROR: Apply rebase (am/rebase) is in progress." >&2
  IN_PROGRESS=true
fi

if [[ "$IN_PROGRESS" == "true" ]]; then
  echo "" >&2
  echo "The rebase was never completed.  You must finish or abandon it first:" >&2
  echo "  Option A — resolve remaining conflicts then continue:" >&2
  echo "    git status                     # see conflicted files" >&2
  echo "    # edit each file, remove all <<<<<<</=======/>>>>>>> markers" >&2
  echo "    git add <resolved-file> ...    # stage each resolved file" >&2
  echo "    git rebase --continue          # advance to next commit" >&2
  echo "    # repeat until output says 'Successfully rebased'" >&2
  echo "  Option B — abort and start fresh:" >&2
  echo "    git rebase --abort" >&2
  echo "    git fetch origin && git rebase origin/main" >&2
  echo "" >&2
  echo "After the rebase completes, re-run ALL checks before submitting." >&2
  exit 1
fi

echo "OK: No rebase in progress."
exit 0
