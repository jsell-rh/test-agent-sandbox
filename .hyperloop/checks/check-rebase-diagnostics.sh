#!/usr/bin/env bash
# check-rebase-diagnostics.sh — collect rebase diagnostic information for BLOCKED reports.
#
# Run this script whenever escalating a task to BLOCKED due to a rebase-conflict
# failure.  It emits six read-only git snapshots formatted for direct inclusion
# in the BLOCKED report under a "Rebase Diagnostics" heading.  It does NOT
# modify the repo; it only reads.
#
# Usage: bash .hyperloop/checks/check-rebase-diagnostics.sh
#
# Always exits 0 (diagnostic output is informational, not a pass/fail gate).
set -uo pipefail

echo "=== Rebase Diagnostics ==="
echo ""

echo "--- (a) Commits on task branch ahead of origin/main ---"
git fetch origin 2>/dev/null || echo "(fetch failed; using cached origin/main)"
git log --oneline origin/main..HEAD 2>&1 || echo "(could not determine ahead commits)"
echo ""

echo "--- (b) Commits on origin/main not yet in branch ---"
git log --oneline HEAD..origin/main 2>&1 || echo "(could not determine behind commits)"
echo ""

echo "--- (c) Files changed on this branch vs origin/main ---"
git diff --name-only origin/main...HEAD 2>&1 || echo "(could not determine changed files)"
echo ""

echo "--- (d) Current working-tree state ---"
git status 2>&1 || echo "(could not determine git status)"
echo ""

echo "--- (e) Files modified by BOTH branches since their common ancestor (conflict candidates) ---"
MERGE_BASE=$(git merge-base HEAD origin/main 2>/dev/null) || true
if [[ -n "${MERGE_BASE:-}" ]]; then
  TASK_FILES=$(git diff --name-only "$MERGE_BASE" HEAD 2>/dev/null || true)
  MAIN_FILES=$(git diff --name-only "$MERGE_BASE" origin/main 2>/dev/null || true)
  BOTH=$(comm -12 \
    <(echo "$TASK_FILES" | sort | grep -v '^$') \
    <(echo "$MAIN_FILES"  | sort | grep -v '^$') \
    2>/dev/null || true)
  if [[ -n "${BOTH:-}" ]]; then
    echo "These files were modified by BOTH the task branch and main — likely conflict sources:"
    echo "$BOTH" | sed 's/^/  /'
  else
    echo "(no files modified by both branches — conflict may be ancestry/cherry-pick related)"
  fi
else
  echo "(could not determine merge base)"
fi
echo ""

echo "--- (f) Simulated merge conflict hunks ---"
BASE_COMMIT=$(git rev-parse origin/main 2>/dev/null) || true
HEAD_COMMIT=$(git rev-parse HEAD 2>/dev/null)
if [[ -n "${MERGE_BASE:-}" && -n "${BASE_COMMIT:-}" && -n "${HEAD_COMMIT:-}" ]]; then
  MERGE_OUT=$(git merge-tree "$MERGE_BASE" "$BASE_COMMIT" "$HEAD_COMMIT" 2>&1 || true)
  if echo "$MERGE_OUT" | grep -qE '(<<<<<<<|>>>>>>>)' 2>/dev/null; then
    echo "Conflict markers detected — showing conflict regions (up to 80 lines):"
    echo "$MERGE_OUT" | grep -E -A 6 -B 1 '(<<<<<<<|>>>>>>>)' | head -80
  else
    echo "No conflict markers found in merge-tree output."
    echo "First 20 lines of merge-tree output (for reference):"
    echo "$MERGE_OUT" | head -20
  fi
else
  echo "(could not run merge simulation — missing refs)"
fi
echo ""

echo "=== End Rebase Diagnostics ==="
exit 0
