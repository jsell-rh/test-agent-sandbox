#!/usr/bin/env bash
# check-impl-commits.sh — detect branches where every commit modifies ONLY
# .hyperloop/state/ files (no implementation delivered).
#
# check-state-commit-history.sh detects state files in any commit and
# recommends cherry-pick surgery.  That is the right remedy when there are
# real implementation commits mixed with bad ones.  But when ALL commits on
# the branch are state-file-only, there is nothing to cherry-pick: the correct
# fix is the bare-branch fallback (reset the branch to origin/main) followed
# by delivering the verdict as stdout only.
#
# This check catches that specific failure mode and emits the correct
# remediation instructions.
#
# Usage: bash .hyperloop/checks/check-impl-commits.sh
#
# Exits 0: branch is even with origin/main (zero commits ahead), or at least
#          one commit modifies a non-state file.
# Exits 1: every commit on this branch modifies ONLY .hyperloop/state/ files.
set -uo pipefail

git fetch origin 2>/dev/null || echo "WARNING: git fetch failed; using cached origin/main."

if git rev-parse --verify origin/main >/dev/null 2>&1; then
  BASE="origin/main"
elif git rev-parse --verify main >/dev/null 2>&1; then
  BASE="main"
else
  echo "ERROR: Cannot find 'origin/main' or 'main' ref." >&2
  exit 1
fi

MERGE_BASE=$(git merge-base HEAD "$BASE" 2>/dev/null || true)
if [[ -z "$MERGE_BASE" ]]; then
  echo "WARNING: Could not determine merge base; skipping impl-commits check."
  exit 0
fi

COMMIT_COUNT=$(git rev-list "${MERGE_BASE}..HEAD" --count 2>/dev/null || echo "0")

if [[ "$COMMIT_COUNT" -eq 0 ]]; then
  echo "OK: Branch is even with origin/main — zero commits to check."
  exit 0
fi

# For each commit on the branch, check whether it touches any non-state file.
IMPL_COMMIT_COUNT=0
while IFS= read -r sha; do
  NON_STATE=$(git diff-tree --no-commit-id -r --name-only "$sha" 2>/dev/null \
    | grep -v '^\.hyperloop/state/' || true)
  if [[ -n "$NON_STATE" ]]; then
    IMPL_COMMIT_COUNT=$(( IMPL_COMMIT_COUNT + 1 ))
  fi
done < <(git rev-list "${MERGE_BASE}..HEAD")

if [[ "$IMPL_COMMIT_COUNT" -eq 0 ]]; then
  OFFENDING=$(git log --oneline "${MERGE_BASE}..HEAD" -- '.hyperloop/state/' 2>/dev/null || true)
  echo "ERROR: All $COMMIT_COUNT commit(s) on this branch modify ONLY .hyperloop/state/ files:" >&2
  echo "$OFFENDING" | sed 's/^/  /' >&2
  echo "" >&2
  echo "  This means no implementation was delivered — only state/review artifacts were" >&2
  echo "  committed.  Cherry-pick surgery is NOT applicable here (there are no" >&2
  echo "  implementation commits to preserve).  Use the bare-branch fallback instead:" >&2
  echo "" >&2
  echo "    BRANCH=\$(git rev-parse --abbrev-ref HEAD)" >&2
  echo "    git fetch origin" >&2
  echo "    git push --force origin origin/main:refs/heads/\$BRANCH" >&2
  echo "" >&2
  echo "  After the fallback, confirm this check exits 0, then report your verdict" >&2
  echo "  as stdout only (not as a .hyperloop/state/ file)." >&2
  exit 1
fi

echo "OK: Branch has $IMPL_COMMIT_COUNT implementation commit(s) that modify non-state files."
exit 0
