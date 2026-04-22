#!/usr/bin/env bash
# check-pre-submit-implementer.sh — single canonical pre-submission gate.
#
# Run this as the LAST step before writing any output (DONE, BLOCKED, or any
# finding).  It combines four checks that prevent orchestrator action errors:
#
#   1. No .hyperloop/state/ files in working tree (untracked or modified).
#   2. No .hyperloop/state/ files in task-branch commit history.
#   3. Branch is rebased onto origin/main with no merge-tree conflicts.
#   4. Branch has at least one implementation commit, or is even with main
#      (detects "state-file-only" branches where cherry-pick surgery is wrong).
#
# If any gate exits non-zero, fix the issue before reporting — a broken branch
# causes 'Action error after 3 attempts' even for BLOCKED verdicts.
#
# Usage: TASK_ID=<id> bash .hyperloop/checks/check-pre-submit-implementer.sh
#
# Exits 0: branch is clean and committable — safe to report any verdict.
# Exits 1: one or more gates failed — do NOT submit until resolved.

set -uo pipefail

TASK_ID="${TASK_ID:-}"
if [[ -z "$TASK_ID" ]]; then
  echo "ERROR: TASK_ID is not set.  Run as: TASK_ID=<id> bash $0" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FAIL=0

echo "=== Pre-submission gate for implementer (TASK_ID=$TASK_ID) ==="
echo ""

# ── Gate 1: working-tree state files ─────────────────────────────────────────
echo "--- Gate 1: working-tree state files ---"
bash "$SCRIPT_DIR/check-pre-add-working-tree.sh" || FAIL=1
echo ""

# ── Gate 2: state files in commit history ────────────────────────────────────
echo "--- Gate 2: state files in commit history ---"
bash "$SCRIPT_DIR/check-state-commit-history.sh" || FAIL=1
echo ""

# ── Gate 3: branch committability (rebase + conflict check) ──────────────────
echo "--- Gate 3: branch committability ---"
TASK_ID="$TASK_ID" bash "$SCRIPT_DIR/check-branch-committable.sh" || FAIL=1
echo ""

# ── Gate 4: implementation commits exist (or branch is even with main) ────────
echo "--- Gate 4: implementation commits (state-file-only detection) ---"
bash "$SCRIPT_DIR/check-impl-commits.sh" || FAIL=1
echo ""

# ── Summary ───────────────────────────────────────────────────────────────────
if [[ "$FAIL" -ne 0 ]]; then
  echo "FAIL: One or more pre-submission gates failed." >&2
  echo "" >&2
  echo "  Common fix — bare-branch fallback (always safe; re-implement after):" >&2
  echo "    BRANCH=\$(git rev-parse --abbrev-ref HEAD)" >&2
  echo "    git fetch origin" >&2
  echo "    git push --force origin origin/main:refs/heads/\$BRANCH" >&2
  echo "  Then re-run this script until it exits 0." >&2
  echo "" >&2
  echo "  Gate 4 failure (state-file-only commits): bare-branch fallback is the ONLY" >&2
  echo "  option — there are no implementation commits to cherry-pick." >&2
  echo "" >&2
  echo "  Gate 2/3 failure (mixed commits): cherry-pick surgery may preserve work;" >&2
  echo "  run 'TASK_ID=\$TASK_ID bash .hyperloop/checks/check-permanent-conflict.sh'" >&2
  echo "  for guided surgery steps." >&2
  echo "" >&2
  echo "  Do NOT report any verdict (DONE, BLOCKED, or finding) until this" >&2
  echo "  script exits 0 — a broken branch causes a permanent orchestrator" >&2
  echo "  action error even for BLOCKED reports." >&2
  exit 1
fi

echo "OK: All pre-submission gates passed — safe to report verdict."
exit 0
