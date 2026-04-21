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
if [[ ! -d "$REVIEWS_DIR" ]]; then
  echo "OK: No reviews directory found — skipping orchestrator multi-error check."
  exit 0
fi

# Match "Action error after N attempts" where N is 2 or any larger number.
# Covers single-digit (2-9) and multi-digit (10+) values.
MATCHES=$(grep -l \
  -E "Action error after ([2-9]|[0-9]{2,}) attempts" \
  "${REVIEWS_DIR}/${TASK_ID}-round-"*.md 2>/dev/null || true)

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
  echo "  REQUIRED ACTION (perform NO git operations):" >&2
  echo "    1. Run:  bash .hyperloop/checks/check-rebase-diagnostics.sh" >&2
  echo "    2. Paste its full output verbatim under a 'Rebase Diagnostics' heading." >&2
  echo "    3. Report this task as BLOCKED — human investigation required." >&2
  exit 1
fi

echo "OK: No orchestrator multi-attempt errors in review history for '${TASK_ID}'."
exit 0
