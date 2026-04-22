#!/usr/bin/env bash
# check-verifier-hook-audit.sh
# Verifier hook-audit gate: run this as part of every Full Check Sweep and
# paste its complete output verbatim into the review (section header included).
#
# This script wraps check-pre-commit-hook-active.sh with diagnostic context
# so the verifier's review contains the root-cause evidence the next round
# needs — specifically whether the pre-commit hook was active when the
# implementer committed, which determines the correct recovery path.
#
# Exit 0 = hook is active — hook bypass unlikely; implementer may have ignored protocol.
# Exit 1 = hook is missing/inactive — hook was not installed; startup protocol was skipped.
#
# When check-state-commit-history.sh exits non-zero, include this output in the
# "Full Check Sweep" section IMMEDIATELY after the failing state-file checks.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
CHECKS_DIR="$REPO_ROOT/.hyperloop/checks"

echo "=== Hook audit (root-cause diagnostic for state-file commits) ==="
echo ""

if bash "$CHECKS_DIR/check-pre-commit-hook-active.sh"; then
  HOOK_EXIT=0
else
  HOOK_EXIT=1
fi

echo ""
if [[ $HOOK_EXIT -eq 0 ]]; then
  echo "INTERPRETATION: Hook was active at commit time."
  echo "  The pre-commit hook was installed and should have blocked any state-file commit."
  echo "  Likely root cause: implementer explicitly bypassed the hook (--no-verify)"
  echo "  or wrote the review file to disk AFTER the last hook-protected commit."
  echo "  OR: the implementer ran 'git add' before 'bash .hyperloop/checks/check-state-dir-clean.sh'."
  echo "  Action for next round: reinforce startup protocol and pre-staging gate rules."
else
  echo "INTERPRETATION: Hook was NOT active at commit time."
  echo "  The pre-commit hook was not installed when the state file was committed."
  echo "  Root cause: implementer skipped 'bash .hyperloop/checks/check-startup-protocol.sh'."
  echo "  Action for next round: implementer MUST run startup protocol as absolute first step."
fi
echo ""
echo "EXIT: $HOOK_EXIT"
exit $HOOK_EXIT
