#!/usr/bin/env bash
# check-startup-protocol.sh
# Atomic startup gate for implementers. Run this as the ABSOLUTE FIRST action
# on any task — before opening any file, before any git add, before any work.
#
# Combines three startup checks into one command:
#   1. Install the state-file pre-commit hook
#   2. Verify the hook is active and executable
#   3. Inspect the branch baseline (non-state diffs vs origin/main)
#
# Exit 0 = startup gates passed; hook is active; branch baseline displayed.
#          Proceed to implementation only after reading the baseline output.
# Exit 1 = startup gate failed or branch is already in a bad state.
#          Read the output and follow the remediation instructions before proceeding.
#
# IMPORTANT: If this script exits 1, do NOT proceed with any implementation work.
# Fix the reported issue first, then re-run this script until it exits 0.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
CHECKS_DIR="$REPO_ROOT/.hyperloop/checks"
FAIL=0

echo "=== Startup protocol gate ==="
echo ""

# ── 1. Install pre-commit hook ────────────────────────────────────────────────
echo "--- Step 1: Install state-file pre-commit hook ---"
if bash "$CHECKS_DIR/check-install-pre-commit-hook.sh"; then
  echo "EXIT: 0"
else
  FAIL=1
  echo "EXIT: 1 — hook installation failed; fix this before proceeding"
fi
echo ""

# ── 2. Verify hook is active ──────────────────────────────────────────────────
echo "--- Step 2: Verify pre-commit hook is active ---"
if bash "$CHECKS_DIR/check-pre-commit-hook-active.sh"; then
  echo "EXIT: 0"
else
  FAIL=1
  echo "EXIT: 1 — hook not active; re-run check-install-pre-commit-hook.sh"
fi
echo ""

# ── 3. Branch baseline: non-state diffs vs origin/main ───────────────────────
echo "--- Step 3: Branch baseline (non-state implementation diffs) ---"
git fetch origin --quiet 2>/dev/null || true

MERGE_BASE=$(git merge-base HEAD origin/main 2>/dev/null || echo "")
if [[ -z "$MERGE_BASE" ]]; then
  echo "WARNING: Could not compute merge-base with origin/main — skipping baseline check."
else
  IMPL_DIFFS=$(git diff --name-only "${MERGE_BASE}..HEAD" -- ':!.hyperloop/state/' 2>/dev/null || true)
  STATE_DIFFS=$(git diff --name-only "${MERGE_BASE}..HEAD" -- '.hyperloop/state/' 2>/dev/null || true)

  if [[ -n "$STATE_DIFFS" ]]; then
    echo "ERROR: State files already appear in commit history on this branch:"
    echo "$STATE_DIFFS" | sed 's/^/  /'
    echo ""
    echo "  The branch is already in a broken state before you start."
    echo "  Run the bare-branch fallback to reset it:"
    echo "    BRANCH=\$(git rev-parse --abbrev-ref HEAD)"
    echo "    git fetch origin"
    echo "    git push --force origin origin/main:refs/heads/\$BRANCH"
    echo "  Then re-run this script."
    FAIL=1
  fi

  if [[ -z "$IMPL_DIFFS" ]]; then
    if [[ -z "$STATE_DIFFS" ]]; then
      echo "NOTICE: Branch is at origin/main — no commits yet on this task branch."
    else
      echo "NOTICE: Branch has ONLY state-file commits — no implementation work found."
    fi
    echo ""
    echo "  !! PRIOR DELIVERY HALT PROTOCOL:"
    echo "  !! If the spec deliverables already exist on origin/main, you must:"
    echo "  !!   1. Print your findings as plain stdout text (not to any file)."
    echo "  !!   2. Do NOT create any file anywhere on disk."
    echo "  !!   3. Do NOT run git add or git commit."
    echo "  !!   4. Exit immediately after printing findings."
    echo "  !! The orchestrator captures stdout and records the review."
  else
    echo "Implementation diffs on this branch (non-state files):"
    echo "$IMPL_DIFFS" | sed 's/^/  /'
  fi
fi
echo ""

# ── Summary ───────────────────────────────────────────────────────────────────
if [[ $FAIL -ne 0 ]]; then
  echo "=== STARTUP GATE FAILED — fix the issues above before proceeding ==="
  exit 1
fi

echo "=== Startup gate passed — hook is active; read baseline output above before proceeding ==="
exit 0
