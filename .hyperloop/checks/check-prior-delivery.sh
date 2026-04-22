#!/usr/bin/env bash
# check-prior-delivery.sh
# Gate for the "prior delivery" scenario: the spec deliverables are already
# present on origin/main and this task branch has no implementation commits
# to add. Run this INSTEAD of the git add / git commit sequence when startup
# Step 3 shows zero non-state diffs on the branch.
#
# Confirms:
#   1. Branch has no non-state implementation commits beyond origin/main.
#   2. No .hyperloop/state/ files exist untracked, modified, staged, or in history.
#
# Exit 0 = prior delivery confirmed; branch is clean.
#           Write findings to stdout, then exit — no files, no commits.
# Exit 1 = unexpected state; follow the remediation instructions printed here.

set -euo pipefail

FAIL=0

git fetch origin --quiet 2>/dev/null || true
MERGE_BASE=$(git merge-base HEAD origin/main 2>/dev/null || echo "")

# ── 1. Confirm no non-state implementation commits exist ──────────────────────
echo "--- Check 1: no non-state implementation commits ---"
if [[ -n "$MERGE_BASE" ]]; then
  IMPL_DIFFS=$(git diff --name-only "${MERGE_BASE}..HEAD" -- ':!.hyperloop/state/' 2>/dev/null || true)
  if [[ -n "$IMPL_DIFFS" ]]; then
    echo "ERROR: Branch has non-state implementation diffs — this is NOT a prior delivery scenario."
    echo "$IMPL_DIFFS" | sed 's/^/  /'
    echo ""
    echo "  Follow the normal implementation commit sequence instead of this script."
    FAIL=1
  else
    echo "OK: No non-state implementation commits on this branch."
  fi
else
  echo "WARNING: Could not compute merge-base with origin/main — skipping commit check."
fi

# ── 2. Confirm no state files in working tree (untracked or modified) ─────────
echo ""
echo "--- Check 2: no state files on disk ---"
UNTRACKED=$(git ls-files --others --exclude-standard -- '.hyperloop/state/' 2>/dev/null || true)
MODIFIED=$(git diff --name-only -- '.hyperloop/state/' 2>/dev/null || true)
STAGED=$(git diff --cached --name-only -- '.hyperloop/state/' 2>/dev/null || true)

DISK_FAIL=0
if [[ -n "$UNTRACKED" ]]; then
  echo "ERROR: Untracked .hyperloop/state/ files found — you created these; do not commit them:"
  echo "$UNTRACKED" | sed 's/^/  [untracked] /'
  DISK_FAIL=1
fi
if [[ -n "$MODIFIED" ]]; then
  echo "ERROR: Modified .hyperloop/state/ files in working tree:"
  echo "$MODIFIED" | sed 's/^/  [modified] /'
  DISK_FAIL=1
fi
if [[ -n "$STAGED" ]]; then
  echo "ERROR: .hyperloop/state/ files staged for commit:"
  echo "$STAGED" | sed 's/^/  [staged] /'
  DISK_FAIL=1
fi
if [[ $DISK_FAIL -ne 0 ]]; then
  echo ""
  echo "  !! These files must NEVER be committed. Discard them now:"
  echo "    git restore --staged .hyperloop/state/ 2>/dev/null || true"
  echo "    git restore .hyperloop/state/ 2>/dev/null || true"
  echo "    git ls-files --others --exclude-standard -- '.hyperloop/state/' | xargs rm -f 2>/dev/null || true"
  echo "  Then re-run this script."
  FAIL=1
else
  echo "OK: No .hyperloop/state/ files on disk, staged, or modified."
fi

# ── 3. Confirm no state files in commit history ───────────────────────────────
echo ""
echo "--- Check 3: no state files in commit history ---"
if [[ -n "$MERGE_BASE" ]]; then
  HISTORY_STATE=$(git log --name-only --pretty=format: "${MERGE_BASE}..HEAD" \
    | grep '^\.hyperloop/state/' | sort -u 2>/dev/null || true)
  if [[ -n "$HISTORY_STATE" ]]; then
    echo "ERROR: State files are already committed in task-branch history:"
    echo "$HISTORY_STATE" | sed 's/^/  /'
    echo ""
    echo "  A fixup commit does NOT fix this — the orchestrator replays commits"
    echo "  one-by-one and will conflict at every offending commit."
    echo ""
    echo "  Bare-branch fallback (resets branch to origin/main):"
    echo "    BRANCH=\$(git rev-parse --abbrev-ref HEAD)"
    echo "    git fetch origin"
    echo "    git push --force origin origin/main:refs/heads/\$BRANCH"
    echo "  Then re-run this script and confirm it exits 0."
    FAIL=1
  else
    echo "OK: No state files in commit history on this branch."
  fi
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
if [[ $FAIL -ne 0 ]]; then
  echo "=== PRIOR DELIVERY GATE FAILED — fix the issues above before writing any verdict ==="
  exit 1
fi

echo "=== Prior delivery confirmed — branch is clean ==="
echo ""
echo "  EXACT NEXT STEPS (do not deviate):"
echo "   1. Write your findings as plain text to stdout now."
echo "   2. Do NOT create any file on disk."
echo "   3. Do NOT run git add or git commit."
echo "   4. Exit after printing your findings."
echo "   The orchestrator captures stdout and writes the review file to main."
exit 0
