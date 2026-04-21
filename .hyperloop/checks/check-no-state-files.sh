#!/usr/bin/env bash
# check-no-state-files.sh — ensure no .hyperloop/state/ files are committed to
# the task branch or currently staged for commit.
#
# Files under .hyperloop/state/ (reviews, task metadata) are managed exclusively
# by the orchestrator and committed directly to main.  When an implementer also
# commits those files to the task branch, both branches carry different versions
# of the same file and a rebase conflict is generated on EVERY subsequent round —
# even after a successful push.  Resolving the conflict in one round does not
# prevent the next round's new review file from triggering an identical conflict.
#
# Usage: bash .hyperloop/checks/check-no-state-files.sh
#
# Exits 0: no .hyperloop/state/ files are staged or committed on the task branch.
# Exits 1: state files are staged or the task branch diverges from main on them.

set -uo pipefail

RC=0

# ── 1. Staged files ──────────────────────────────────────────────────────────
STAGED=$(git diff --name-only --cached 2>/dev/null | grep '^\.hyperloop/state/' || true)
if [[ -n "$STAGED" ]]; then
  echo "ERROR: The following .hyperloop/state/ files are staged for commit:" >&2
  echo "$STAGED" | sed 's/^/  /' >&2
  echo "" >&2
  echo "  These files belong exclusively to the orchestrator (written to main)." >&2
  echo "  Committing them to the task branch creates a permanent rebase conflict." >&2
  echo "" >&2
  echo "  Fix: git restore --staged .hyperloop/state/" >&2
  RC=1
fi

# ── 2. Already-committed state files that differ from main ───────────────────
if git rev-parse --verify origin/main >/dev/null 2>&1; then
  BASE="origin/main"
elif git rev-parse --verify main >/dev/null 2>&1; then
  BASE="main"
else
  echo "WARNING: Cannot locate a 'main' ref; skipping committed-state-file check."
  exit "$RC"
fi

COMMITTED=$(git diff --name-only "${BASE}...HEAD" 2>/dev/null | grep '^\.hyperloop/state/' || true)
if [[ -n "$COMMITTED" ]]; then
  echo "ERROR: The following .hyperloop/state/ files were committed on this task branch" >&2
  echo "  and now differ from ${BASE}:" >&2
  echo "$COMMITTED" | sed 's/^/  /' >&2
  echo "" >&2
  echo "  These files cause a rebase conflict on every round because the orchestrator" >&2
  echo "  also writes them to main.  You must restore them to match main before pushing." >&2
  echo "" >&2
  echo "  !! WARNING: A fixup commit is INSUFFICIENT if state files appear in intermediate !!" >&2
  echo "  !! commits — the orchestrator replays commits one-by-one and will conflict at  !!" >&2
  echo "  !! the original bad commit even if the final tree is restored to match main.   !!" >&2
  echo "" >&2
  echo "  Also run check-state-commit-history.sh to detect intermediate-commit violations:" >&2
  echo "    bash .hyperloop/checks/check-state-commit-history.sh" >&2
  echo "" >&2
  echo "  If check-state-commit-history.sh also fails, run the permanent-conflict check:" >&2
  echo "    TASK_ID=<id> bash .hyperloop/checks/check-permanent-conflict.sh" >&2
  echo "  and follow its branch-surgery instructions instead of the fixup below." >&2
  echo "" >&2
  echo "  Fixup (only safe when state files are ONLY in the final tree, not in prior commits):" >&2
  echo "    git fetch origin" >&2
  echo "    git checkout origin/main -- .hyperloop/state/" >&2
  echo "    git add .hyperloop/state/" >&2
  echo "    git commit -m 'fix: restore orchestrator state files to match main'" >&2
  echo "" >&2
  echo "  Then re-run the full checks sweep including check-state-commit-history.sh." >&2
  RC=1
fi

if [[ "$RC" -eq 0 ]]; then
  echo "OK: No .hyperloop/state/ files are staged or diverge from ${BASE:-main} on this branch."
fi

exit "$RC"
