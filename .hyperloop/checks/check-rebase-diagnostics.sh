#!/usr/bin/env bash
# check-rebase-diagnostics.sh — collect rebase diagnostic information for BLOCKED reports.
#
# Run this script whenever escalating a task to BLOCKED due to a rebase-conflict
# failure.  It emits four read-only git snapshots formatted for direct inclusion
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

echo "=== End Rebase Diagnostics ==="
exit 0
