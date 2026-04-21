#!/usr/bin/env bash
# check-push-sync.sh — verify the current branch is pushed to origin.
#
# After resolving a rebase, implementers must push the updated branch to origin
# so the orchestrator sees the rebased commits.  A locally-rebased branch that
# was never pushed leaves the orchestrator reading the old, conflicting commits.
#
# Usage: bash .hyperloop/checks/check-push-sync.sh
#
# Exits 0 when local HEAD matches origin/<branch>.
# Exits 1 when the branch has unpushed commits or the remote branch is missing.
set -euo pipefail

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null) || {
  echo "ERROR: Could not determine current branch." >&2
  exit 1
}

if [[ "$BRANCH" == "HEAD" ]]; then
  echo "ERROR: Detached HEAD — check out a named branch before running this check." >&2
  exit 1
fi

# Fetch to get the true remote state.
echo "Fetching origin to check push sync..."
git fetch origin 2>&1 || { echo "WARNING: git fetch failed; proceeding with cached origin state." >&2; }

REMOTE_REF="origin/${BRANCH}"

if ! git rev-parse --verify "$REMOTE_REF" >/dev/null 2>&1; then
  echo "ERROR: Remote branch '${REMOTE_REF}' does not exist — push the branch first:" >&2
  echo "  git push --force-with-lease origin HEAD" >&2
  exit 1
fi

LOCAL_COMMIT=$(git rev-parse HEAD)
REMOTE_COMMIT=$(git rev-parse "$REMOTE_REF")

if [[ "$LOCAL_COMMIT" != "$REMOTE_COMMIT" ]]; then
  UNPUSHED=$(git rev-list "${REMOTE_REF}..HEAD" --count 2>/dev/null || echo "?")
  echo "ERROR: Branch '${BRANCH}' has ${UNPUSHED} local commit(s) not yet on origin." >&2
  echo "  The orchestrator reads from origin — an unpushed rebase is invisible to it." >&2
  echo "  Fix: git push --force-with-lease origin HEAD" >&2
  echo "  (--force-with-lease is safe after a rebase and rejects accidental overwrites.)" >&2
  exit 1
fi

echo "OK: Branch '${BRANCH}' is in sync with origin/${BRANCH} (HEAD: ${LOCAL_COMMIT:0:12})."
exit 0
