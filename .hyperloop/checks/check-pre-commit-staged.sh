#!/usr/bin/env bash
# check-pre-commit-staged.sh — gate for implementers to run BEFORE `git commit`.
#
# Catches .hyperloop/state/ files in the staging area before they are baked into
# a commit. Once committed, a fixup is insufficient (the orchestrator replays
# commits one-by-one and will conflict at the original bad commit).
#
# Usage: bash .hyperloop/checks/check-pre-commit-staged.sh
#
# Exits 0: staging area is clean of state files — safe to commit.
# Exits 1: state files are staged — abort the commit, unstage, and try again.

set -uo pipefail

RC=0

STAGED=$(git diff --name-only --cached 2>/dev/null | grep '^\.hyperloop/state/' || true)

if [[ -n "$STAGED" ]]; then
  echo "ERROR: The following .hyperloop/state/ files are staged for commit:" >&2
  echo "$STAGED" | sed 's/^/  /' >&2
  echo "" >&2
  echo "  State files are owned exclusively by the orchestrator (written to main)." >&2
  echo "  Committing them to a task branch causes a permanent rebase conflict that" >&2
  echo "  cannot be fixed with a follow-up fixup commit." >&2
  echo "" >&2
  echo "  Fix: unstage the offending files and DO NOT include them in any commit." >&2
  echo "    git restore --staged .hyperloop/state/" >&2
  echo "" >&2
  echo "  If you need to deliver a BLOCKED verdict or review finding: write it as" >&2
  echo "  plain stdout text.  The orchestrator reads that output and commits the" >&2
  echo "  review file to main on your behalf." >&2
  RC=1
fi

if [[ "$RC" -eq 0 ]]; then
  echo "OK: No .hyperloop/state/ files are staged — safe to commit."
fi

exit "$RC"
