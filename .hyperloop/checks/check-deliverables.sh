#!/usr/bin/env bash
# check-deliverables.sh
# Verifies that the spec file referenced by the task was the one actually read
# by the implementer, by checking that the Spec-Ref trailers on branch commits
# point to a file path that exists on disk.
#
# Also verifies that the spec_ref file itself exists at the declared path —
# catching cases where an implementer invented or guessed a different filename.
#
# Usage: TASK_ID=task-012 bash check-deliverables.sh
# Exit 0 = pass, non-zero = fail

set -euo pipefail

: "${TASK_ID:?TASK_ID env var required (e.g. task-012)}"

TASK_FILE=".hyperloop/state/tasks/${TASK_ID}.md"

if [[ ! -f "$TASK_FILE" ]]; then
  echo "ERROR: Task file not found: $TASK_FILE" >&2
  exit 1
fi

# Extract spec_ref from the front-matter (strip @<hash> suffix if present)
SPEC_REF=$(grep -m1 '^spec_ref:' "$TASK_FILE" | sed 's/spec_ref:[[:space:]]*//' | sed 's/@[a-f0-9]*//')

if [[ -z "$SPEC_REF" ]]; then
  echo "ERROR: Could not parse spec_ref from $TASK_FILE" >&2
  exit 1
fi

echo "Declared spec_ref: $SPEC_REF"

FAILURES=0

# 1. Verify the declared spec file actually exists on disk
if [[ ! -f "$SPEC_REF" ]]; then
  echo "FAIL: Declared spec_ref '$SPEC_REF' does not exist on disk — cannot validate deliverables." >&2
  FAILURES=$((FAILURES + 1))
else
  echo "OK: Spec file exists at $SPEC_REF"
fi

# 2. Check that Spec-Ref commit trailers reference a file that actually exists
BASE=$(git rev-parse --verify origin/main 2>/dev/null && echo origin/main || echo origin/master 2>/dev/null || echo "")
if [[ -z "$BASE" ]]; then
  # Fall back to first commit if no remote
  BASE=$(git rev-list --max-parents=0 HEAD)
fi

COMMITS=$(git log --format="%H" "${BASE}..HEAD" 2>/dev/null || true)
if [[ -z "$COMMITS" ]]; then
  echo "PASS: No branch commits to check (working on base branch)."
else
  while IFS= read -r commit_hash; do
    trailer=$(git log -1 --format="%B" "$commit_hash" | grep -i '^Spec-Ref:' | head -1 || true)
    if [[ -z "$trailer" ]]; then
      # Missing trailer is checked by check-spec-ref.sh; skip here
      continue
    fi
    commit_spec=$(echo "$trailer" | sed 's/Spec-Ref:[[:space:]]*//' | sed 's/@[a-f0-9]*//')
    if [[ ! -f "$commit_spec" ]]; then
      echo "FAIL [$commit_hash]: Spec-Ref '$commit_spec' does not exist on disk — implementer may have used a fabricated path." >&2
      FAILURES=$((FAILURES + 1))
    else
      echo "OK   [$commit_hash]: Spec-Ref '$commit_spec' exists on disk"
    fi
  done <<< "$COMMITS"
fi

if [[ $FAILURES -gt 0 ]]; then
  echo ""
  echo "FAIL: $FAILURES deliverable check(s) failed." >&2
  exit 1
fi

echo "PASS: Deliverable checks passed for $TASK_ID"
