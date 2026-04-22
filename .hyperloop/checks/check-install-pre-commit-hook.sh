#!/usr/bin/env bash
# check-install-pre-commit-hook.sh
# Installs a git pre-commit hook that runs check-no-state-files.sh before
# every commit, blocking state-file commits at the git layer.
#
# Implementers MUST run this as the first action on any task. It is idempotent.
# Exit 0 = hook is installed and active. Exit 1 = could not install hook.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOK_FILE="$REPO_ROOT/.git/hooks/pre-commit"
CHECK_SCRIPT=".hyperloop/checks/check-no-state-files.sh"

HOOK_BODY="#!/usr/bin/env bash
# Installed by check-install-pre-commit-hook.sh — do not remove.
bash \"\$(git rev-parse --show-toplevel)/$CHECK_SCRIPT\"
"

if [[ -f "$HOOK_FILE" ]]; then
  if grep -q "$CHECK_SCRIPT" "$HOOK_FILE"; then
    echo "OK: State-file pre-commit hook already installed at $HOOK_FILE"
    exit 0
  else
    # Hook exists but doesn't include our check — append it.
    echo "" >> "$HOOK_FILE"
    echo "# Hyperloop state-file guard (appended by check-install-pre-commit-hook.sh)" >> "$HOOK_FILE"
    printf 'bash "$(git rev-parse --show-toplevel)/%s"\n' "$CHECK_SCRIPT" >> "$HOOK_FILE"
    echo "OK: Appended state-file guard to existing pre-commit hook at $HOOK_FILE"
    exit 0
  fi
fi

# No hook exists — create it.
printf '%s' "$HOOK_BODY" > "$HOOK_FILE"
chmod +x "$HOOK_FILE"
echo "OK: Installed state-file pre-commit hook at $HOOK_FILE"
exit 0
