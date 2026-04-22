#!/usr/bin/env bash
# check-branch-committable-pre-report.sh
# Pre-report gate: implementers MUST run this before writing any verdict
# (PASS, FAIL, or BLOCKED). If it exits non-zero, the branch is not
# committable; run branch surgery before proceeding.
#
# Combines check-no-state-files.sh (staged + history) and the core logic
# of check-branch-committable.sh into a single gate exit.
#
# Exit 0 = branch is committable; safe to write verdict.
# Exit 1 = branch is NOT committable; surgery required.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
CHECKS_DIR="$REPO_ROOT/.hyperloop/checks"
FAIL=0

echo "=== Pre-report branch committability gate ==="
echo ""

# ── 1. State-file check (staged + history) ───────────────────────────────────
echo "--- check-no-state-files.sh ---"
if bash "$CHECKS_DIR/check-no-state-files.sh"; then
  echo "EXIT: 0"
else
  FAIL=1
  echo "EXIT: 1"
fi
echo ""

# ── 2. State files in commit history ─────────────────────────────────────────
echo "--- state-file commit history check ---"
git fetch origin --quiet 2>/dev/null || true
MERGE_BASE=$(git merge-base HEAD origin/main 2>/dev/null || echo "")
if [[ -n "$MERGE_BASE" ]]; then
  HISTORY_COMMITS=$(git log --oneline "${MERGE_BASE}..HEAD" -- '.hyperloop/state/' 2>/dev/null || true)
  if [[ -n "$HISTORY_COMMITS" ]]; then
    echo "ERROR: State files found in task-branch commit history:"
    echo "$HISTORY_COMMITS" | sed 's/^/  /'
    echo ""
    echo "  A fixup commit is INSUFFICIENT — the orchestrator replays commits"
    echo "  one-by-one and will conflict at every offending commit."
    echo ""
    echo "  Bare-branch fallback (use when no impl commits need preserving):"
    echo "    BRANCH=\$(git rev-parse --abbrev-ref HEAD)"
    echo "    git fetch origin"
    echo "    git push --force origin origin/main:refs/heads/\$BRANCH"
    echo ""
    echo "  Cherry-pick surgery (use when impl commits exist alongside state commits):"
    echo "    git fetch origin"
    echo "    git checkout -b \$(git rev-parse --abbrev-ref HEAD)-surgery origin/main"
    echo "    # cherry-pick only the impl commits (exclude state-file-only commits)"
    echo "    git cherry-pick <impl-sha> ..."
    echo "    git push --force origin HEAD:\$(git rev-parse --abbrev-ref HEAD | sed 's/-surgery//')"
    FAIL=1
    echo "EXIT: 1"
  else
    echo "OK: No state files in commit history on this branch."
    echo "EXIT: 0"
  fi
fi
echo ""

# ── Summary ───────────────────────────────────────────────────────────────────
if [[ $FAIL -ne 0 ]]; then
  echo "=== BRANCH IS NOT COMMITTABLE — do NOT write a verdict yet ==="
  echo "    Fix the issues above, then re-run this script until it exits 0."
  exit 1
fi

echo "=== Branch is committable — safe to write verdict. ==="
exit 0
