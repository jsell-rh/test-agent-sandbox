#!/usr/bin/env bash
# check-staged-state.sh — abort if any .hyperloop/state/ file is staged for commit.
#
# Run this before every `git commit`. State files committed on a task branch
# cause a permanent rebase conflict: the orchestrator replays commits one-by-one
# and collides with the same file it writes to main when recording any verdict.
# A fixup commit cannot cure this — the bad commit still conflicts during replay.
#
# Exit 0 = safe to commit
# Exit 1 = state file staged; remove it before committing

set -euo pipefail

staged=$(git diff --cached --name-only 2>/dev/null | grep '^\.hyperloop/state/' || true)

if [[ -n "$staged" ]]; then
  echo "ERROR: The following .hyperloop/state/ files are staged for commit:"
  while IFS= read -r f; do
    echo "  $f"
  done <<< "$staged"
  echo ""
  echo "  State files MUST NOT be committed on a task branch."
  echo "  The orchestrator writes these files to main when recording verdicts;"
  echo "  committing them here causes a permanent rebase conflict every round."
  echo "  A fixup commit does NOT fix it — history surgery is required once committed."
  echo ""
  echo "  Unstage with:  git restore --staged .hyperloop/state/"
  exit 1
fi

echo "OK: No .hyperloop/state/ files staged — safe to commit."
exit 0
