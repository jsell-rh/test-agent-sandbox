#!/usr/bin/env bash
# check-spec-ref.sh
# Verifies that every commit on the current branch (vs main/master) carries a
# Spec-Ref trailer whose path matches the task file's spec_ref field.
#
# Usage: TASK_ID=task-012 bash check-spec-ref.sh
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

echo "Expected Spec-Ref path: $SPEC_REF"

# Determine base branch
BASE=$(git rev-parse --verify origin/main 2>/dev/null && echo origin/main || echo origin/master)

# Collect all Spec-Ref trailers from commits on this branch
FAILURES=0
while IFS= read -r commit_hash; do
  trailer=$(git log -1 --format="%B" "$commit_hash" | grep -i '^Spec-Ref:' | head -1 || true)
  if [[ -z "$trailer" ]]; then
    echo "FAIL [$commit_hash]: Missing Spec-Ref trailer" >&2
    FAILURES=$((FAILURES + 1))
  else
    commit_spec=$(echo "$trailer" | sed 's/Spec-Ref:[[:space:]]*//' | sed 's/@[a-f0-9]*//')
    if [[ "$commit_spec" != "$SPEC_REF" ]]; then
      echo "FAIL [$commit_hash]: Spec-Ref is '$commit_spec', expected '$SPEC_REF'" >&2
      FAILURES=$((FAILURES + 1))
    else
      echo "OK   [$commit_hash]: Spec-Ref matches"
    fi
  fi
done < <(git log --format="%H" "${BASE}..HEAD")

if [[ $FAILURES -gt 0 ]]; then
  echo ""
  echo "FAIL: $FAILURES commit(s) have wrong or missing Spec-Ref trailer." >&2
  exit 1
fi

echo "PASS: All commits carry correct Spec-Ref: $SPEC_REF"
