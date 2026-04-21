#!/usr/bin/env bash
# check-merge-simulation.sh — simulate applying this branch onto main without
# actually changing the working tree or index.
#
# Ancestry checks (check-rebase-clean.sh) confirm the branch is rebased, but
# they cannot detect content-level conflicts that would surface when the
# orchestrator applies the branch. This script performs a real merge-tree
# simulation to catch those hidden conflicts before submission.
#
# Usage: bash .hyperloop/checks/check-merge-simulation.sh
#
# Exits 0 when the branch would apply onto main without conflicts.
# Exits 1 when a content conflict is detected.
set -euo pipefail

# Fetch latest remote state.
# Treat fetch failure as a hard error: a simulation against stale origin/main
# can falsely report OK while the branch still conflicts against the true main.
echo "Fetching origin to ensure origin/main is up-to-date..."
if ! git fetch origin 2>&1; then
  echo "ERROR: git fetch origin failed — cannot run a reliable merge simulation against the true latest main." >&2
  echo "  Fix the network/auth issue and re-run this check before submitting." >&2
  exit 1
fi

# Resolve authoritative base.
if git rev-parse --verify origin/main >/dev/null 2>&1; then
  BASE="origin/main"
elif git rev-parse --verify main >/dev/null 2>&1; then
  BASE="main"
else
  echo "ERROR: Cannot find 'origin/main' or 'main' ref." >&2
  exit 1
fi

BASE_COMMIT=$(git rev-parse "$BASE")
HEAD_COMMIT=$(git rev-parse HEAD)

# If HEAD is already at or behind main there is nothing to simulate.
if [[ "$HEAD_COMMIT" == "$BASE_COMMIT" ]]; then
  echo "OK: HEAD is at ${BASE} — no merge needed."
  exit 0
fi

MERGE_BASE=$(git merge-base HEAD "$BASE")

# If main is not an ancestor of HEAD the branch is not rebased; ancestry check
# should have caught this, but surface it clearly here too.
if [[ "$MERGE_BASE" != "$BASE_COMMIT" ]]; then
  echo "ERROR: ${BASE} is not an ancestor of HEAD — branch not rebased." >&2
  echo "  Fix: git fetch origin && git rebase ${BASE}" >&2
  exit 1
fi

# Use git merge-tree to simulate a three-way merge in-memory.
# Output is non-empty when conflicts exist.
CONFLICT_OUTPUT=$(git merge-tree "$MERGE_BASE" "$BASE_COMMIT" "$HEAD_COMMIT" 2>&1 || true)

# git merge-tree signals conflicts with lines containing conflict markers.
# Do NOT anchor with ^ — some git versions emit markers with leading context
# (e.g. after a diff header) so the anchored pattern produces false negatives.
# This matches check-rebase-diagnostics.sh which intentionally omits ^ for the
# same reason.
if echo "$CONFLICT_OUTPUT" | grep -qE '(<<<<<<<|=======|>>>>>>>)'; then
  echo "ERROR: Merge simulation detected content conflicts between this branch and ${BASE}." >&2
  echo "Conflicted sections (excerpt):" >&2
  echo "$CONFLICT_OUTPUT" | grep -E '(<<<<<<<|=======|>>>>>>>|changed in both)' | head -20 >&2
  echo "" >&2
  echo "Fix: git fetch origin && git rebase ${BASE}" >&2
  echo "     Resolve each conflict, git add <file>, git rebase --continue" >&2
  echo "     Then re-run all checks." >&2
  exit 1
fi

AHEAD=$(git rev-list "${BASE}..HEAD" --count)
echo "OK: Merge simulation passed — branch applies onto ${BASE} without conflicts (${AHEAD} commit(s) ahead)."
exit 0
