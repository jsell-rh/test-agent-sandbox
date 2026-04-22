#!/usr/bin/env bash
# check-pre-submit.sh — implementer pre-submission gate.
#
# Run this after all commits are made, before reporting work complete.
# Bundles the critical checks that prevent permanent rebase conflicts:
#
#   1. check-staged-state.sh       — no state files currently staged
#   2. check-state-commit-history.sh — no state files anywhere in branch history
#   3. check-no-state-files.sh     — no state files in final working tree vs main
#   4. check-branch-committable.sh — full committability verdict
#
# WHY: check-staged-state.sh (pre-commit) only catches files not yet committed.
# A mistake can still land a .hyperloop/state/ file in a commit even if the
# staged check passed (e.g. via `git add -A`). The orchestrator replays commits
# one-by-one, so a state file in any intermediate commit causes a permanent
# rebase conflict that no fixup can cure.
#
# Exit 0 = branch is safe to submit
# Exit 1 = one or more checks failed; do NOT submit until resolved

set -uo pipefail

CHECKS_DIR="$(dirname "$0")"
FAILED=()

run_check() {
  local name="$1"
  local script="$CHECKS_DIR/$name"

  if [[ ! -x "$script" ]]; then
    echo "WARN: $name not found or not executable — skipping"
    return
  fi

  echo "--- $name ---"
  if bash "$script"; then
    echo "OK: $name passed"
  else
    echo "FAIL: $name"
    FAILED+=("$name")
  fi
  echo ""
}

run_check "check-staged-state.sh"
run_check "check-state-commit-history.sh"
run_check "check-no-state-files.sh"
run_check "check-branch-committable.sh"

if [[ ${#FAILED[@]} -gt 0 ]]; then
  echo "=========================================="
  echo "PRE-SUBMIT FAILED — do NOT report done yet"
  echo "  Failed checks:"
  for f in "${FAILED[@]}"; do
    echo "    - $f"
  done
  echo ""
  echo "  If state files appear in commit history, a fixup commit is NOT enough."
  echo "  Use cherry-pick surgery or the bare-branch fallback:"
  echo "    BRANCH=\$(git rev-parse --abbrev-ref HEAD)"
  echo "    git fetch origin"
  echo "    git push --force origin origin/main:refs/heads/\$BRANCH"
  echo "=========================================="
  exit 1
fi

echo "=========================================="
echo "PRE-SUBMIT OK — branch is safe to submit"
echo "=========================================="
exit 0
