#!/usr/bin/env bash
# check-state-dir-clean.sh
# Gate: verify no .hyperloop/state/ files exist as untracked, modified, or
# staged in the working tree. Run this BEFORE any `git add` to catch
# accidental state-file creation before it can be staged.
#
# check-no-state-files.sh covers staged + history; this covers the earlier
# point — files that exist on disk but haven't been staged yet. Catching
# them here means the agent can delete them before they ever enter a commit.
#
# Exit 0 = working tree has no state files — safe to git add.
# Exit 1 = state files present — delete them and write output to stdout only.

set -euo pipefail

FAIL=0

# ── Untracked state files ─────────────────────────────────────────────────────
UNTRACKED=$(git ls-files --others --exclude-standard -- '.hyperloop/state/' 2>/dev/null || true)
if [[ -n "$UNTRACKED" ]]; then
  echo "ERROR: Untracked .hyperloop/state/ files found in working tree:"
  echo "$UNTRACKED" | sed 's/^/  /'
  echo ""
  echo "  These files were created by this agent and must NEVER be committed."
  echo "  Write their content as stdout output instead, then delete them:"
  echo "    rm -f \$(git ls-files --others --exclude-standard -- '.hyperloop/state/')"
  FAIL=1
fi

# ── Modified (unstaged) state files ──────────────────────────────────────────
MODIFIED=$(git diff --name-only -- '.hyperloop/state/' 2>/dev/null || true)
if [[ -n "$MODIFIED" ]]; then
  echo "ERROR: Modified (unstaged) .hyperloop/state/ files found:"
  echo "$MODIFIED" | sed 's/^/  /'
  echo ""
  echo "  Discard these modifications — do not stage or commit them:"
  echo "    git restore .hyperloop/state/"
  FAIL=1
fi

# ── Staged state files ────────────────────────────────────────────────────────
STAGED=$(git diff --cached --name-only -- '.hyperloop/state/' 2>/dev/null || true)
if [[ -n "$STAGED" ]]; then
  echo "ERROR: .hyperloop/state/ files are already staged:"
  echo "$STAGED" | sed 's/^/  /'
  echo ""
  echo "  Unstage them immediately — do not commit:"
  echo "    git restore --staged .hyperloop/state/"
  FAIL=1
fi

if [[ $FAIL -ne 0 ]]; then
  echo ""
  echo "  !! State files must NEVER be committed on a task branch."
  echo "  !! The orchestrator writes these files to main — a committed"
  echo "  !! agent-side copy causes a permanent rebase conflict every round."
  echo "  !! Write all findings and verdicts as stdout text only."
  exit 1
fi

echo "OK: No .hyperloop/state/ files in working tree or staged area."
exit 0
