#!/usr/bin/env bash
# check-post-commit-state.sh
# Post-commit gate: run immediately after every `git commit` to verify the
# commit did not capture any .hyperloop/state/ files.
#
# The pre-commit hook is the primary guard, but if it was not active (startup
# protocol skipped, wrong worktree, or hook bypassed), it silently allows bad
# commits through. This check provides a second verification point so the
# implementer discovers the problem immediately — before pushing or reporting.
#
# Exit 0 = most recent commit is state-file-free; branch is still clean.
# Exit 1 = most recent commit contains state files — surgery required NOW.
#
# Recovery (bare-branch fallback — no impl commits to preserve):
#   BRANCH=$(git rev-parse --abbrev-ref HEAD)
#   git fetch origin
#   git push --force origin origin/main:refs/heads/$BRANCH
#
# Recovery (cherry-pick surgery — impl commits exist alongside state commit):
#   git fetch origin
#   git checkout -b $(git rev-parse --abbrev-ref HEAD)-surgery origin/main
#   git cherry-pick <impl-only-sha> ...
#   git push --force origin HEAD:$(git rev-parse --abbrev-ref HEAD | sed 's/-surgery//')

set -euo pipefail

FAIL=0

# ── 1. Inspect the most recent commit ────────────────────────────────────────
LAST_SHA=$(git rev-parse HEAD 2>/dev/null || echo "")
if [[ -z "$LAST_SHA" ]]; then
  echo "ERROR: Could not resolve HEAD — are you in a git repository?"
  exit 1
fi

LAST_STATE_FILES=$(git show --name-only --pretty=format: "$LAST_SHA" \
  | grep '^\.hyperloop/state/' || true)

if [[ -n "$LAST_STATE_FILES" ]]; then
  echo "ERROR: The most recent commit ($LAST_SHA) contains .hyperloop/state/ files:"
  echo "$LAST_STATE_FILES" | sed 's/^/  /'
  echo ""
  echo "  The pre-commit hook was NOT active when this commit was made."
  echo "  A fixup commit is INSUFFICIENT — the orchestrator replays commits"
  echo "  one-by-one and will conflict at this commit on every merge attempt."
  echo ""

  # Diagnose: mixed commit (impl + state) vs state-only commit
  IMPL_FILES=$(git show --name-only --pretty=format: "$LAST_SHA" \
    | grep -v '^\.hyperloop/state/' | grep -v '^$' || true)
  if [[ -n "$IMPL_FILES" ]]; then
    echo "  DIAGNOSIS: MIXED COMMIT — this commit contains both state files"
    echo "  and implementation files. This confirms the pre-commit hook was"
    echo "  not active. You MUST run the startup protocol on restart:"
    echo "    bash .hyperloop/checks/check-startup-protocol.sh"
    echo ""
    echo "  Implementation files in this commit:"
    echo "$IMPL_FILES" | sed 's/^/    /'
    echo ""
    echo "  Recovery — cherry-pick surgery (preserves implementation files):"
    BRANCH=$(git rev-parse --abbrev-ref HEAD)
    echo "    git fetch origin"
    echo "    git checkout -b ${BRANCH}-surgery origin/main"
    echo "    git cherry-pick $LAST_SHA  # then amend to drop state files"
    echo "    # OR re-implement from scratch on the clean branch"
    echo "    git push --force origin HEAD:${BRANCH}"
  else
    echo "  DIAGNOSIS: STATE-ONLY COMMIT — this commit contains only state"
    echo "  files with no implementation. The bare-branch fallback is sufficient:"
    echo "    BRANCH=\$(git rev-parse --abbrev-ref HEAD)"
    echo "    git fetch origin"
    echo "    git push --force origin origin/main:refs/heads/\$BRANCH"
  fi
  echo ""
  echo "  Run the fallback NOW — before pushing or writing any verdict."
  FAIL=1
fi

# ── 2. Confirm hook is active going forward ───────────────────────────────────
if [[ $FAIL -ne 0 ]]; then
  echo "  After recovery, run: bash .hyperloop/checks/check-startup-protocol.sh"
  echo "  to install the hook and prevent recurrence."
  echo ""
  echo "FAIL: Post-commit state check — commit captured state files."
  exit 1
fi

echo "OK: Most recent commit ($LAST_SHA) contains no .hyperloop/state/ files."
exit 0
