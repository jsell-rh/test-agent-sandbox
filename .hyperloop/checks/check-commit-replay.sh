#!/usr/bin/env bash
# check-commit-replay.sh — detect per-commit conflicts the orchestrator replay hits.
#
# git merge-tree (used by check-merge-simulation.sh and check-branch-committable.sh)
# simulates a three-way merge of the FINAL branch state onto main.  It does NOT
# detect cases where the orchestrator applies commits ONE-BY-ONE:  an intermediate
# commit's diff can conflict with main even when the final merged tree is clean,
# and those per-commit conflicts cause "Rebase conflict with main" action errors
# that pass every three-way check.
#
# This script creates a temporary worktree at origin/main and applies each
# task-branch commit sequentially as a patch using git am.  A non-zero exit
# means at least one commit cannot be applied cleanly — the orchestrator will
# encounter the same failure during its commit-by-commit apply.
#
# Usage: bash .hyperloop/checks/check-commit-replay.sh
#
# Exits 0: every commit on the branch replays cleanly onto origin/main.
# Exits 1: at least one commit conflicts during per-commit replay.

set -uo pipefail

echo "Fetching origin to ensure origin/main is up-to-date..."
if ! git fetch origin 2>&1; then
  echo "ERROR: git fetch origin failed — cannot run commit-replay simulation against true latest main." >&2
  exit 1
fi

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

if [[ "$HEAD_COMMIT" == "$BASE_COMMIT" ]]; then
  echo "OK: HEAD is at $BASE — no commits to replay."
  exit 0
fi

MERGE_BASE=$(git merge-base HEAD "$BASE")

if [[ "$MERGE_BASE" != "$BASE_COMMIT" ]]; then
  echo "ERROR: Branch is not rebased onto $BASE (run check-rebase-clean.sh first)." >&2
  exit 1
fi

COMMIT_COUNT=$(git rev-list --count "${MERGE_BASE}..HEAD")
if [[ "$COMMIT_COUNT" -eq 0 ]]; then
  echo "OK: No commits between merge-base and HEAD — nothing to replay."
  exit 0
fi

# Create a temporary worktree at origin/main.
# Using a worktree keeps the current checkout untouched and allows git am to run
# in an isolated environment that exactly matches origin/main.
TMPDIR_BASE=$(mktemp -d)
WORKTREE_PATH="${TMPDIR_BASE}/replay"

cleanup() {
  git -C "$WORKTREE_PATH" am --abort 2>/dev/null || true
  git worktree remove "$WORKTREE_PATH" --force 2>/dev/null || true
  rm -rf "$TMPDIR_BASE"
}
trap cleanup EXIT

echo "Creating temporary worktree at $BASE for per-commit replay..."
if ! git worktree add "$WORKTREE_PATH" "$BASE" 2>&1; then
  echo "ERROR: Could not create worktree — check git version and permissions." >&2
  exit 1
fi

echo "Generating patches for $COMMIT_COUNT commit(s) from ${MERGE_BASE}..HEAD..."
# format-patch stdout: one mbox stream covering all commits in order (oldest first).
PATCHES=$(git format-patch "${MERGE_BASE}..HEAD" --stdout 2>&1)

echo "Applying patches onto $BASE one-by-one (strict, no 3-way fallback)..."
APPLY_EXIT=0
APPLY_OUTPUT=""
if ! APPLY_OUTPUT=$(echo "$PATCHES" | git -C "$WORKTREE_PATH" am 2>&1); then
  APPLY_EXIT=1
fi

if [[ "$APPLY_EXIT" -ne 0 ]]; then
  # Abort the in-progress am so the cleanup trap can remove the worktree cleanly.
  git -C "$WORKTREE_PATH" am --abort 2>/dev/null || true

  echo "" >&2
  echo "╔══════════════════════════════════════════════════════════════╗" >&2
  echo "║          PER-COMMIT REPLAY CONFLICT DETECTED                 ║" >&2
  echo "╚══════════════════════════════════════════════════════════════╝" >&2
  echo "" >&2
  echo "  At least one task-branch commit cannot be applied onto $BASE" >&2
  echo "  as a patch.  check-merge-simulation.sh may show PASS because it" >&2
  echo "  simulates a three-way merge of the final tree — it cannot see" >&2
  echo "  this per-commit conflict." >&2
  echo "" >&2
  echo "  The orchestrator applies commits one-by-one and will hit the same" >&2
  echo "  failure, producing 'Rebase conflict with main / Action error'." >&2
  echo "" >&2
  echo "  git am output (last 40 lines):" >&2
  echo "$APPLY_OUTPUT" | tail -40 | sed 's/^/    /' >&2
  echo "" >&2
  echo "  REQUIRED FIX — bare-branch emergency fallback:" >&2
  echo "    BRANCH=\$(git rev-parse --abbrev-ref HEAD)" >&2
  echo "    git fetch origin" >&2
  echo "    git push --force origin origin/main:refs/heads/\$BRANCH" >&2
  echo "    bash .hyperloop/checks/check-push-sync.sh" >&2
  echo "" >&2
  echo "  After the bare-branch fallback this check will exit 0 (no commits" >&2
  echo "  to replay).  Then report BLOCKED — do NOT attempt to resolve the" >&2
  echo "  per-commit conflict; implementation conflicts of this type require" >&2
  echo "  human judgment." >&2
  exit 1
fi

echo "OK: All $COMMIT_COUNT commit(s) replay cleanly onto $BASE — no per-commit conflicts."
exit 0
