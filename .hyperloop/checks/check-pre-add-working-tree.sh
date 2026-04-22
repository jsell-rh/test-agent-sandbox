#!/usr/bin/env bash
# check-pre-add-working-tree.sh — gate for implementers to run BEFORE `git add`.
#
# Detects .hyperloop/state/ files that exist in the working tree (untracked,
# modified, or already staged) before they can be swept into a commit via
# `git add -A` or `git add .`.
#
# check-pre-commit-staged.sh catches staged files, but only works AFTER you
# have already run `git add`.  This script runs BEFORE `git add` and catches
# state files that would otherwise be staged by a wildcard add command.
#
# Usage: bash .hyperloop/checks/check-pre-add-working-tree.sh
#
# Exits 0: no .hyperloop/state/ files found in working tree — safe to git add.
# Exits 1: state files present — delete them before running `git add`.

set -uo pipefail

RC=0

# Untracked state files (new files that would be picked up by `git add -A`)
UNTRACKED=$(git ls-files --others --exclude-standard -- '.hyperloop/state/' 2>/dev/null || true)

# Modified-but-unstaged state files
MODIFIED=$(git diff --name-only -- '.hyperloop/state/' 2>/dev/null || true)

# Already-staged state files (shouldn't be here before git add, but catch anyway)
STAGED=$(git diff --name-only --cached -- '.hyperloop/state/' 2>/dev/null || true)

ALL_FOUND=$(printf '%s\n%s\n%s' "$UNTRACKED" "$MODIFIED" "$STAGED" | sort -u | grep -v '^$' || true)

if [[ -n "$ALL_FOUND" ]]; then
  echo "ERROR: .hyperloop/state/ files detected in working tree:" >&2
  echo "$ALL_FOUND" | sed 's/^/  /' >&2
  echo "" >&2
  echo "  State files are owned exclusively by the orchestrator (written to main)." >&2
  echo "  ANY git-add command — including `git add -A` or `git add .` — will sweep" >&2
  echo "  these into your next commit, causing a permanent rebase conflict." >&2
  echo "" >&2
  echo "  !! NEVER use `git add -A` or `git add .` on a task branch.  !!" >&2
  echo "  Add only specific implementation files by explicit path." >&2
  echo "" >&2
  echo "  To deliver a verdict or BLOCKED finding: write it as stdout text only." >&2
  echo "  DO NOT create a .md file under .hyperloop/state/ to hold your verdict." >&2
  echo "  Example (BLOCKED):" >&2
  echo "    echo 'BLOCKED: <reason>' # written to stdout, not to any file" >&2
  echo "" >&2
  echo "  Fix: delete the offending files before running git add." >&2
  echo "    rm -f <listed files above>" >&2
  RC=1
fi

if [[ "$RC" -eq 0 ]]; then
  echo "OK: No .hyperloop/state/ files in working tree — safe to run git add."
fi

exit "$RC"
