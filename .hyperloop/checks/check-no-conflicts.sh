#!/usr/bin/env bash
# check-no-conflicts.sh — fail if any tracked file contains unresolved merge-conflict markers.
#
# Unresolved conflict markers (<<<<<<, =======, >>>>>>>) left in source files
# indicate an incomplete rebase or merge. This check catches that state before
# submission so the orchestrator never sees a conflicted branch.
#
# Usage: bash .hyperloop/checks/check-no-conflicts.sh
#
# Exits 0 when no conflict markers are found.
# Exits 1 when one or more files still contain conflict markers.
set -euo pipefail

CONFLICT_MARKERS='^(<<<<<<<|=======|>>>>>>>)'

# Search only tracked files to avoid noise from .git internals.
CONFLICTED=$(git diff --name-only --diff-filter=U 2>/dev/null || true)

# Also scan file contents for markers (catches markers left after partial resolution).
MARKER_FILES=$(git grep -l "$CONFLICT_MARKERS" -- ':!*.sh' 2>/dev/null || true)

ALL=$(printf '%s\n%s\n' "$CONFLICTED" "$MARKER_FILES" | sort -u | grep -v '^$' || true)

if [[ -n "$ALL" ]]; then
  echo "ERROR: Unresolved conflict markers found in the following file(s):" >&2
  echo "$ALL" | sed 's/^/  /' >&2
  echo "" >&2
  echo "To fix:" >&2
  echo "  1. Open each file and resolve every <<<<<<<...=======>...>>>>>>> block." >&2
  echo "  2. git add <resolved-file> for each file." >&2
  echo "  3. git rebase --continue   (do NOT run git commit)." >&2
  echo "  4. Repeat until rebase completes, then re-run all checks." >&2
  exit 1
fi

echo "OK: No unresolved conflict markers detected."
exit 0
