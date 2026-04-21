#!/usr/bin/env bash
# check-infra.sh — verify that all required check scripts exist and are executable.
#
# Run this BEFORE any other check script. If it exits non-zero, the checks
# infrastructure is incomplete and must be restored before proceeding.
#
# Usage: bash .hyperloop/checks/check-infra.sh
#
# Exits 0 when every required script is present and executable.
# Exits 1 when any required script is missing or not executable.
set -euo pipefail

CHECKS_DIR="$(dirname "$0")"

REQUIRED_SCRIPTS=(
  "check-deps.sh"
  "check-task-meta.sh"
  "check-timer-tests.sh"
  "check-rebase-clean.sh"
  "check-rebase-state.sh"
  "check-no-conflicts.sh"
  "check-merge-simulation.sh"
)

all_ok=true

for script in "${REQUIRED_SCRIPTS[@]}"; do
  path="${CHECKS_DIR}/${script}"
  if [[ ! -f "$path" ]]; then
    echo "ERROR: Required check script is missing: ${path}" >&2
    all_ok=false
  elif [[ ! -x "$path" ]]; then
    echo "ERROR: Required check script is not executable: ${path}" >&2
    all_ok=false
  else
    echo "OK: ${script}"
  fi
done

if [[ "$all_ok" != "true" ]]; then
  echo "" >&2
  echo "Checks infrastructure is incomplete. Restore missing scripts before proceeding." >&2
  exit 1
fi

echo "Checks infrastructure OK."
exit 0
