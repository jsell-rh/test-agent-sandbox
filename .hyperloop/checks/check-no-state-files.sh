#!/usr/bin/env bash
# check-no-state-files.sh
# Gate: verify no .hyperloop/state/ files appear in the staged area or commit history.
# Implementers MUST run this before every `git commit` and before reporting any result.
# Exit 0 = clean. Exit 1 = state files present — surgery required before proceeding.

set -euo pipefail

PASS=0
FAIL=1

# ── 1. Staged area check ──────────────────────────────────────────────────────
STAGED_STATE=$(git diff --cached --name-only | grep '^\.hyperloop/state/' || true)
if [[ -n "$STAGED_STATE" ]]; then
  echo "ERROR: The following .hyperloop/state/ files are STAGED for commit:"
  echo "$STAGED_STATE" | sed 's/^/  /'
  echo ""
  echo "  Action required:"
  echo "    git restore --staged .hyperloop/state/"
  echo "  Then write your verdict as stdout text — do NOT commit a review file."
  PASS=1
fi

# ── 2. Commit-history check ───────────────────────────────────────────────────
git fetch origin --quiet 2>/dev/null || true
MERGE_BASE=$(git merge-base HEAD origin/main 2>/dev/null || echo "")

if [[ -n "$MERGE_BASE" ]]; then
  HISTORY_STATE=$(git log --name-only --pretty=format: "${MERGE_BASE}..HEAD" \
    | grep '^\.hyperloop/state/' | sort -u || true)
  if [[ -n "$HISTORY_STATE" ]]; then
    echo "ERROR: .hyperloop/state/ files appear in commit history on this branch:"
    echo "$HISTORY_STATE" | sed 's/^/  /'
    echo ""
    echo "  A fixup commit does NOT fix this — the orchestrator replays commits"
    echo "  one-by-one and will conflict at every offending commit."
    echo ""
    echo "  If all branch commits are state-file-only (no implementation):"
    echo "    BRANCH=\$(git rev-parse --abbrev-ref HEAD)"
    echo "    git push --force origin origin/main:refs/heads/\$BRANCH"
    echo ""
    echo "  Then re-run this check and confirm exit 0 before proceeding."
    PASS=1
  fi
fi

if [[ $PASS -eq 0 ]]; then
  echo "OK: No .hyperloop/state/ files in staged area or commit history."
fi

exit $PASS
