#!/usr/bin/env bash
# check-task-branch.sh — verify the current branch matches the task file's branch field.
#
# A rebase performed on the wrong branch (e.g. main) does nothing for the task
# branch. This check catches that mistake before any rebase sequence runs so
# the implementer stays on the correct branch throughout.
#
# Usage: TASK_ID=task-012 bash .hyperloop/checks/check-task-branch.sh
#
# Exits 0 when the current branch matches the task's declared branch.
# Exits 1 when on a different branch or in detached-HEAD state.
set -euo pipefail

TASK_ID="${TASK_ID:?TASK_ID environment variable is required}"
TASK_FILE=".hyperloop/state/tasks/${TASK_ID}.md"

if [[ ! -f "$TASK_FILE" ]]; then
  echo "ERROR: Task file not found: ${TASK_FILE}" >&2
  exit 1
fi

# Extract the branch field from the YAML front-matter (between the two --- lines).
EXPECTED_BRANCH=$(awk '
  /^---$/ { delim++; next }
  delim == 1 && /^branch: / { sub("^branch: ", ""); print; found=1 }
  delim == 2 { exit }
  END { if (!found) print "" }
' "$TASK_FILE")

if [[ -z "$EXPECTED_BRANCH" ]]; then
  echo "ERROR: No 'branch:' field found in ${TASK_FILE}" >&2
  echo "  Cannot verify branch without knowing the expected branch name." >&2
  exit 1
fi

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null) || {
  echo "ERROR: Could not determine current branch (is this a git repo?)." >&2
  exit 1
}

if [[ "$CURRENT_BRANCH" == "HEAD" ]]; then
  echo "ERROR: Detached HEAD — check out the task branch first:" >&2
  echo "  git fetch origin" >&2
  echo "  git checkout ${EXPECTED_BRANCH}" >&2
  echo "  # If the branch does not exist locally:" >&2
  echo "  git checkout -b ${EXPECTED_BRANCH} origin/${EXPECTED_BRANCH}" >&2
  exit 1
fi

if [[ "$CURRENT_BRANCH" != "$EXPECTED_BRANCH" ]]; then
  echo "ERROR: Currently on '${CURRENT_BRANCH}' but task ${TASK_ID} requires branch '${EXPECTED_BRANCH}'." >&2
  echo "  Rebasing on the wrong branch does nothing for the task branch." >&2
  echo "  Fix:" >&2
  echo "    git fetch origin" >&2
  echo "    git checkout ${EXPECTED_BRANCH}" >&2
  echo "    # If the branch does not exist locally:" >&2
  echo "    git checkout -b ${EXPECTED_BRANCH} origin/${EXPECTED_BRANCH}" >&2
  exit 1
fi

echo "OK: On correct task branch '${CURRENT_BRANCH}' (expected by task ${TASK_ID})."
exit 0
