#!/usr/bin/env bash
# check-rebase-clean.sh — verify the current branch is rebased onto main.
#
# Checks that main (or origin/main) is a direct ancestor of HEAD, meaning
# the branch has been rebased and will merge cleanly into main.
#
# Usage: bash .hyperloop/checks/check-rebase-clean.sh
#
# Exits 0 when the branch is rebased onto main.
# Exits 1 when the branch has diverged and needs rebasing.
set -euo pipefail

# Fetch latest remote state so the check is never based on a stale origin/main.
# Without this, a branch may pass the check locally but conflict when the
# orchestrator applies it against the true latest main.
echo "Fetching origin to ensure origin/main is up-to-date..."
git fetch origin 2>&1 || { echo "WARNING: git fetch failed; proceeding with cached origin/main." >&2; }

# Prefer origin/main (authoritative), fall back to local main.
if git rev-parse --verify origin/main >/dev/null 2>&1; then
  BASE="origin/main"
elif git rev-parse --verify main >/dev/null 2>&1; then
  BASE="main"
else
  echo "ERROR: Cannot find 'origin/main' or 'main' ref." >&2
  exit 1
fi

HEAD_COMMIT=$(git rev-parse HEAD)
BASE_COMMIT=$(git rev-parse "$BASE")

# HEAD is at (or behind) main — nothing to rebase.
if [[ "$HEAD_COMMIT" == "$BASE_COMMIT" ]]; then
  echo "OK: HEAD is at ${BASE} — nothing to rebase."
  exit 0
fi

MERGE_BASE=$(git merge-base HEAD "$BASE")

if [[ "$MERGE_BASE" != "$BASE_COMMIT" ]]; then
  BEHIND=$(git rev-list HEAD.."$BASE" --count)
  echo "ERROR: Branch is ${BEHIND} commit(s) behind ${BASE}. Rebase required before submitting." >&2
  echo "  Fix: git fetch origin && git rebase ${BASE}" >&2
  echo "  Then resolve any conflicts, run 'git rebase --continue', and re-run checks." >&2
  exit 1
fi

AHEAD=$(git rev-list "$BASE"..HEAD --count)
echo "OK: Branch is rebased onto ${BASE} (${AHEAD} commit(s) ahead, merge-base == ${BASE} tip)."
exit 0
