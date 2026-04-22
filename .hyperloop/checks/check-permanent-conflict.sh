#!/usr/bin/env bash
# check-permanent-conflict.sh — detect permanently broken task branches and
# prescribe non-interactive branch surgery.
#
# A "permanent conflict" occurs when BOTH of the following are true:
#   (1) The task branch has .hyperloop/state/ files embedded in commit history.
#   (2) The task has accumulated 2 or more consecutive orchestrator action errors.
#
# In this state no agent-level git operation can break the cycle:
#   - Every rebase attempt conflicts on orchestrator-managed state files.
#   - The orchestrator replays commits one-by-one, so a "fixup commit" that
#     restores state files in the final tree does NOT prevent the conflict at
#     the offending intermediate commit.
#   - Every apply attempt fails, so BLOCKED reports cannot be committed to main
#     and the orchestrator keeps spawning new rounds indefinitely.
#
# REQUIRED FIX: a human (or an agent acting on explicit human approval) must
# rebuild the task branch by cherry-picking only the implementation commits
# onto a fresh base from current main.  The exact commands are printed below.
#
# Usage: TASK_ID=<id> bash .hyperloop/checks/check-permanent-conflict.sh
#
# Exits 0: branch is NOT in a permanent conflict state.
# Exits 1: permanent conflict detected — human branch surgery required.

set -uo pipefail

TASK_ID="${TASK_ID:-}"
if [[ -z "$TASK_ID" ]]; then
  echo "ERROR: TASK_ID is not set.  Run as: TASK_ID=<id> bash $0" >&2
  exit 1
fi

# ── Fetch so all checks compare against the true latest main ─────────────────
echo "Fetching origin..."
git fetch origin 2>/dev/null || echo "WARNING: git fetch failed; using cached origin/main."

# ── Determine base ref ────────────────────────────────────────────────────────
if git rev-parse --verify origin/main >/dev/null 2>&1; then
  BASE="origin/main"
elif git rev-parse --verify main >/dev/null 2>&1; then
  BASE="main"
else
  echo "WARNING: Cannot locate a main ref; skipping permanent-conflict check."
  exit 0
fi

MERGE_BASE=$(git merge-base HEAD "$BASE" 2>/dev/null || true)
if [[ -z "$MERGE_BASE" ]]; then
  echo "WARNING: Could not determine merge base; skipping permanent-conflict check."
  exit 0
fi

# ── Check 1: state files in commit history ────────────────────────────────────
# Look for any commit between merge-base and HEAD that touches .hyperloop/state/.
# A "fixup commit" that restores those files to match main does NOT eliminate the
# offending earlier commit — the orchestrator replays commits one-by-one and will
# conflict at the original bad commit regardless of what the final tree looks like.
STATE_FILE_COMMITS=$(git log --oneline "${MERGE_BASE}..HEAD" -- '.hyperloop/state/' \
  2>/dev/null || true)

# ── Check 2: consecutive action-error streak ──────────────────────────────────
REVIEWS_DIR=".hyperloop/state/reviews"

# Collect round numbers from origin/main (orchestrator writes review files there).
ALL_ROUNDS=$(git ls-tree -r --name-only origin/main 2>/dev/null \
  | grep -E "^${REVIEWS_DIR}/${TASK_ID}-round-[0-9]+\.md$" \
  | sed "s|.*${TASK_ID}-round-||;s|\.md$||" \
  | sort -n -r | head -10 || true)

STREAK=0
for ROUND in $ALL_ROUNDS; do
  REVIEW_FILE="${REVIEWS_DIR}/${TASK_ID}-round-${ROUND}.md"
  CONTENT=""
  if [[ -f "$REVIEW_FILE" ]]; then
    CONTENT=$(cat "$REVIEW_FILE" 2>/dev/null || true)
  elif git rev-parse --verify origin/main >/dev/null 2>&1; then
    CONTENT=$(git show "origin/main:${REVIEW_FILE}" 2>/dev/null || true)
  fi
  if echo "$CONTENT" | grep -q "Action error after"; then
    STREAK=$((STREAK + 1))
  else
    break  # only count consecutive trailing errors
  fi
done

# ── Evaluate ──────────────────────────────────────────────────────────────────
if [[ -n "$STATE_FILE_COMMITS" && "$STREAK" -ge 2 ]]; then
  BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown-branch")

  # Identify implementation commits (those that do NOT touch .hyperloop/state/).
  IMPL_COMMITS=$(git log --oneline "${MERGE_BASE}..HEAD" \
    --invert-grep --grep 'Action error' \
    -- ':!.hyperloop/state/' \
    2>/dev/null | grep -v '^$' || true)

  echo "" >&2
  echo "╔══════════════════════════════════════════════════════════════╗" >&2
  echo "║            PERMANENT CONFLICT DETECTED                       ║" >&2
  echo "╚══════════════════════════════════════════════════════════════╝" >&2
  echo "" >&2
  echo "  Task:   ${TASK_ID}" >&2
  echo "  Branch: ${BRANCH}" >&2
  echo "  Errors: ${STREAK} consecutive orchestrator action-error rounds" >&2
  echo "" >&2
  echo "  Root cause: .hyperloop/state/ files are embedded in this branch's" >&2
  echo "  commit history.  Every round the orchestrator writes new review files" >&2
  echo "  to main; every rebase replays the offending commits and conflicts." >&2
  echo "  A fixup commit cannot fix this — the conflict recurs at the original" >&2
  echo "  bad commit during replay, not just in the final tree." >&2
  echo "" >&2
  echo "  State-file commits found in branch history:" >&2
  echo "$STATE_FILE_COMMITS" | sed 's/^/    /' >&2
  echo "" >&2
  echo "  ── NO AGENT CAN FIX THIS AUTOMATICALLY ──────────────────────" >&2
  echo "  Human branch surgery is required.  Follow these steps exactly:" >&2
  echo "" >&2
  echo "  Step 1 — Identify implementation commits (non-state-file):" >&2
  echo "    git fetch origin" >&2
  echo "    git log --oneline ${MERGE_BASE}..origin/${BRANCH} -- ':!.hyperloop/state/'" >&2
  echo "" >&2
  echo "  Step 2 — Create a clean branch from current main:" >&2
  echo "    git checkout -b ${BRANCH}-surgery origin/main" >&2
  echo "" >&2
  echo "  Step 3 — Cherry-pick only the implementation commits (oldest first):" >&2
  if [[ -n "$IMPL_COMMITS" ]]; then
    echo "  (Candidate commits detected — verify each before cherry-picking:)" >&2
    echo "$IMPL_COMMITS" | tac | awk '{print "    git cherry-pick " $1}' >&2
  else
    echo "    # No implementation commits detected automatically." >&2
    echo "    # Run Step 1 manually and cherry-pick the results." >&2
  fi
  echo "" >&2
  echo "  Step 4 — Verify no state files:" >&2
  echo "    bash .hyperloop/checks/check-no-state-files.sh" >&2
  echo "    bash .hyperloop/checks/check-state-commit-history.sh" >&2
  echo "    bash .hyperloop/checks/check-rebase-clean.sh" >&2
  echo "" >&2
  echo "  Step 5 — Replace the broken branch on origin:" >&2
  echo "    git push --force origin HEAD:${BRANCH}" >&2
  echo "  Then immediately verify the surgery landed:" >&2
  echo "    bash .hyperloop/checks/check-push-sync.sh" >&2
  echo "    bash .hyperloop/checks/check-state-commit-history.sh" >&2
  echo "" >&2
  echo "  Step 6 — Trigger a new implementer round after surgery completes." >&2
  echo "" >&2
  echo "  DO NOT attempt another automated round before surgery is complete." >&2
  echo "  Every additional automated round adds a new review file to main," >&2
  echo "  which becomes another conflict the next agent must resolve." >&2
  exit 1
fi

# ── Warn-only cases ───────────────────────────────────────────────────────────
if [[ -n "$STATE_FILE_COMMITS" && "$STREAK" -lt 2 ]]; then
  echo "WARNING: State files found in commit history (${STREAK} consecutive error(s))." >&2
  echo "  Run 'bash .hyperloop/checks/check-state-commit-history.sh' for details." >&2
  echo "  If action errors accumulate to 2+, re-run this check — surgery will be required." >&2
fi

if [[ -z "$STATE_FILE_COMMITS" && "$STREAK" -ge 2 ]]; then
  echo "WARNING: ${STREAK} consecutive action errors but no state files in history." >&2
  echo "  The conflict may be in a non-state file.  Run check-rebase-diagnostics.sh." >&2
fi

echo "OK: No permanent conflict pattern detected for '${TASK_ID}'."
exit 0
