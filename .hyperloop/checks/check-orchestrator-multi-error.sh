#!/usr/bin/env bash
# check-orchestrator-multi-error.sh — detect any orchestrator multi-attempt error in task history.
#
# "Action error after N attempts" (N ≥ 2) recorded in a round review means the
# orchestrator's own apply/merge mechanism failed N times in sequence.  This is
# structurally different from a simple rebase conflict: even a perfectly rebased
# branch will hit the same failure because the problem is in the orchestrator's
# apply path, not in the branch's ancestry.  Standard rebase resolution cannot
# fix this.
#
# This check exits non-zero as soon as it finds ANY review that records such a
# failure, giving both implementers and verifiers a mechanical gate that prevents
# further automated retry.
#
# IMPORTANT: review files are committed to main by the orchestrator, not to the
# task branch.  When the task branch has not yet been rebased, local filesystem
# access cannot see those files.  This script therefore checks BOTH the local
# filesystem AND origin/main directly so the gate is never bypassed by a stale
# local tree.
#
# Usage: TASK_ID=<id> bash .hyperloop/checks/check-orchestrator-multi-error.sh
#
# Exits 0: no multi-attempt orchestrator errors found in review history.
# Exits 1: one or more reviews contain "Action error after N attempts" (N ≥ 2) → report BLOCKED.

set -uo pipefail

TASK_ID="${TASK_ID:-}"
if [[ -z "$TASK_ID" ]]; then
  echo "ERROR: TASK_ID is not set.  Run as: TASK_ID=<id> bash $0" >&2
  exit 1
fi

REVIEWS_DIR=".hyperloop/state/reviews"

# Fetch so origin/main reflects the latest orchestrator writes.
echo "Fetching origin to ensure review files from origin/main are current..."
git fetch origin 2>/dev/null || echo "WARNING: git fetch failed; using cached origin/main."

# Pattern that matches N ≥ 2 in "Action error after N attempts".
# Covers single-digit (2-9) and multi-digit (10+) values.
ERROR_PATTERN="Action error after ([2-9]|[0-9]{2,}) attempts"

# --- Pass 1: local filesystem (works when task branch is rebased onto main) ---
LOCAL_MATCHES=""
if [[ -d "$REVIEWS_DIR" ]]; then
  LOCAL_MATCHES=$(grep -rl \
    -E "$ERROR_PATTERN" \
    "$REVIEWS_DIR/" 2>/dev/null \
    | grep "${TASK_ID}-round-" || true)
fi

# --- Pass 2: origin/main directly (catches files absent from the local tree) ---
# Review files are written by the orchestrator to main.  If the task branch has
# not yet been rebased, they will not appear in the local working tree.  Reading
# them via "git show origin/main:<path>" bypasses this blind spot.
ORIGIN_MATCHES=""
if git rev-parse --verify origin/main >/dev/null 2>&1; then
  while IFS= read -r fpath; do
    if git show "origin/main:${fpath}" 2>/dev/null \
        | grep -qE "$ERROR_PATTERN"; then
      ORIGIN_MATCHES="${ORIGIN_MATCHES}${fpath}"$'\n'
    fi
  done < <(git ls-tree -r --name-only origin/main 2>/dev/null \
           | grep -E "^${REVIEWS_DIR}/${TASK_ID}-round-[0-9]+\.md$" || true)
fi

# Merge results, deduplicate, drop empty lines.
MATCHES=$(printf '%s\n' "$LOCAL_MATCHES" "$ORIGIN_MATCHES" \
          | sort -u | grep -v '^[[:space:]]*$' || true)

if [[ -n "$MATCHES" ]]; then
  echo "" >&2
  echo "ERROR: Orchestrator multi-attempt error found in review history for '${TASK_ID}'." >&2
  echo "" >&2
  echo "  Offending round review(s):" >&2
  echo "$MATCHES" | sed 's/^/    /' >&2
  echo "" >&2
  echo "  'Action error after N attempts' (N ≥ 2) means the orchestrator's own apply" >&2
  echo "  mechanism failed that many times in a single round — this is NOT a rebase" >&2
  echo "  conflict the implementer can resolve locally.  A correctly rebased branch" >&2
  echo "  will fail the orchestrator's apply for exactly the same structural reason." >&2
  echo "" >&2
  echo "  NOTE: the orchestrator always appends 'Please rebase onto main and resolve" >&2
  echo "  the conflicts.' to every action-error message regardless of N.  This text" >&2
  echo "  is auto-generated boilerplate — do NOT follow it when N ≥ 2." >&2
  echo "" >&2
  echo "  REQUIRED ACTION:" >&2
  echo "    1. Run:  bash .hyperloop/checks/check-rebase-diagnostics.sh" >&2
  echo "       Paste its full output verbatim under a 'Rebase Diagnostics' heading." >&2
  echo "    2. Ensure branch is committable BEFORE reporting BLOCKED:" >&2
  echo "       TASK_ID=${TASK_ID} bash .hyperloop/checks/check-branch-committable.sh" >&2
  echo "       If it exits non-zero, apply the bare-branch emergency fallback:" >&2
  echo "         BRANCH=\$(git rev-parse --abbrev-ref HEAD)" >&2
  echo "         git fetch origin" >&2
  echo "         git push --force origin origin/main:refs/heads/\$BRANCH" >&2
  echo "         bash .hyperloop/checks/check-push-sync.sh" >&2
  echo "       Re-run check-branch-committable.sh until it exits 0." >&2
  echo "    3. Report this task as BLOCKED — human investigation required." >&2
  echo "" >&2
  echo "  DO NOT attempt git rebase, cherry-pick, or any implementation work." >&2
  echo "  Only the branch-committability steps above (bare-branch fallback) are permitted." >&2
  echo "  The orchestrator applies the task branch before recording ANY verdict including" >&2
  echo "  BLOCKED — skipping step 2 reproduces 'Action error after 3 attempts' forever." >&2
  exit 1
fi

echo "OK: No orchestrator multi-attempt errors in review history for '${TASK_ID}' (checked local tree and origin/main)."
exit 0
