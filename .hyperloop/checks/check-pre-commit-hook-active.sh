#!/usr/bin/env bash
# check-pre-commit-hook-active.sh
# Verifies that the state-file pre-commit hook is installed and executable.
# Run this immediately after check-install-pre-commit-hook.sh to confirm the
# git-layer guard is active before any `git add` or `git commit`.
#
# Worktree-safe: resolves the hook path via --git-common-dir.
#
# Exit 0 = hook is installed and executable — git-layer guard is active.
# Exit 1 = hook is missing or not executable — run check-install-pre-commit-hook.sh.

set -euo pipefail

CHECK_SCRIPT=".hyperloop/checks/check-no-state-files.sh"
GIT_COMMON_DIR="$(git rev-parse --git-common-dir)"
HOOK_FILE="$GIT_COMMON_DIR/hooks/pre-commit"

if [[ ! -f "$HOOK_FILE" ]]; then
  echo "ERROR: Pre-commit hook not found at $HOOK_FILE"
  echo "  Run: bash .hyperloop/checks/check-install-pre-commit-hook.sh"
  exit 1
fi

if [[ ! -x "$HOOK_FILE" ]]; then
  echo "ERROR: Pre-commit hook exists but is not executable: $HOOK_FILE"
  echo "  Run: chmod +x $HOOK_FILE"
  echo "  Or re-run: bash .hyperloop/checks/check-install-pre-commit-hook.sh"
  exit 1
fi

if ! grep -q "$CHECK_SCRIPT" "$HOOK_FILE"; then
  echo "ERROR: Pre-commit hook at $HOOK_FILE does not contain the state-file guard."
  echo "  The hook exists but was not installed by check-install-pre-commit-hook.sh."
  echo "  Run: bash .hyperloop/checks/check-install-pre-commit-hook.sh"
  exit 1
fi

echo "OK: State-file pre-commit hook is installed and active at $HOOK_FILE"
exit 0
