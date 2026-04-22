#!/usr/bin/env bash
# check-impl-not-state-only.sh
# Gate: verify that at least one commit on this task branch modifies a
# non-state file. Fails when every change on the branch is under
# .hyperloop/state/ — which means the agent committed only review/state
# artifacts and produced no implementation work.
#
# This catches the "implementation already on main" case where an agent
# accidentally commits only a state file and leaves the branch permanently
# broken (the orchestrator will conflict on that state file every round).
#
# Exit 0 = branch has ≥1 non-state implementation change — safe to proceed.
# Exit 1 = branch touches only .hyperloop/state/ files — strip and reassess.

set -euo pipefail

git fetch origin --quiet 2>/dev/null || true
MERGE_BASE=$(git merge-base HEAD origin/main 2>/dev/null || echo "")

if [[ -z "$MERGE_BASE" ]]; then
  echo "OK: Could not compute merge-base with origin/main — skipping check."
  exit 0
fi

# Files changed on this branch, excluding .hyperloop/state/
IMPL_CHANGES=$(git diff --name-only "${MERGE_BASE}..HEAD" -- ':!.hyperloop/state/' 2>/dev/null || true)

if [[ -z "$IMPL_CHANGES" ]]; then
  # Double-check: are there ANY changes at all?
  ALL_CHANGES=$(git diff --name-only "${MERGE_BASE}..HEAD" 2>/dev/null || true)
  if [[ -z "$ALL_CHANGES" ]]; then
    echo "OK: Branch has no commits beyond origin/main — nothing to validate."
    exit 0
  fi

  # There are changes but ALL of them are state files
  STATE_FILES=$(git diff --name-only "${MERGE_BASE}..HEAD" -- '.hyperloop/state/' 2>/dev/null || true)
  echo "ERROR: This branch contains ONLY .hyperloop/state/ changes — no implementation files."
  echo "  State-only files found:"
  echo "$STATE_FILES" | sed 's/^/    /'
  echo ""
  echo "  This means either:"
  echo "    (a) The implementation was already present on origin/main before this branch was created."
  echo "    (b) The agent committed a state/review file without any real implementation work."
  echo ""
  echo "  !! A state-file-only branch will conflict with main on every orchestrator round."
  echo "  !! Do NOT report PASS, FAIL, or BLOCKED until the branch is stripped."
  echo ""
  echo "  Bare-branch fallback (resets branch to origin/main, removing all commits):"
  echo "    BRANCH=\$(git rev-parse --abbrev-ref HEAD)"
  echo "    git fetch origin"
  echo "    git push --force origin origin/main:refs/heads/\$BRANCH"
  echo ""
  echo "  After stripping, re-assess whether the task spec is already satisfied"
  echo "  on origin/main. If satisfied, write findings to stdout only — no commits."
  exit 1
fi

echo "OK: Branch has non-state implementation changes:"
echo "$IMPL_CHANGES" | sed 's/^/  /'
exit 0
