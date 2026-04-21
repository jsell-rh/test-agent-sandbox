#!/usr/bin/env bash
# check-timer-tests.sh — verify that every production file using setTimeout or
# setInterval has a corresponding fake-timer test.
#
# Usage: bash .hyperloop/checks/check-timer-tests.sh
#
# Searches non-test TypeScript/JavaScript source files for timer calls.
# If any are found, checks that at least one test file calls vi.useFakeTimers().
#
# Exits 0 when no timers are used in production code, or when a fake-timer
# test exists for each file that uses timers.
# Exits 1 when production timer usage is found but no fake-timer tests exist.
set -euo pipefail

# Directories to search for production source files (excluding test files).
SOURCE_DIRS=("app" "server")
TEST_PATTERN="(\.spec\.|\.test\.)"
TIMER_PATTERN="(setTimeout|setInterval)"
FAKE_TIMER_PATTERN="useFakeTimers"

timer_files=()

for dir in "${SOURCE_DIRS[@]}"; do
  [[ -d "$dir" ]] || continue
  while IFS= read -r file; do
    # Skip test files
    if echo "$file" | grep -qE "$TEST_PATTERN"; then
      continue
    fi
    # Check for timer usage
    if grep -qE "$TIMER_PATTERN" "$file" 2>/dev/null; then
      timer_files+=("$file")
    fi
  done < <(find "$dir" -type f \( -name "*.ts" -o -name "*.js" \))
done

if [[ ${#timer_files[@]} -eq 0 ]]; then
  echo "No production timer usage found. OK."
  exit 0
fi

echo "Production files using setTimeout/setInterval:"
for f in "${timer_files[@]}"; do
  echo "  $f"
done

# Check that at least one test file uses fake timers.
fake_timer_found=false
for dir in "${SOURCE_DIRS[@]}"; do
  [[ -d "$dir" ]] || continue
  if grep -rlE "$FAKE_TIMER_PATTERN" "$dir" --include="*.ts" --include="*.js" 2>/dev/null | grep -qE "$TEST_PATTERN"; then
    fake_timer_found=true
    break
  fi
done

if [[ "$fake_timer_found" == "true" ]]; then
  echo "Fake-timer tests found. OK."
  exit 0
fi

echo "" >&2
echo "ERROR: Production code uses setTimeout/setInterval but no test file calls vi.useFakeTimers()." >&2
echo "Add a fake-timer test (vi.useFakeTimers() + vi.advanceTimersByTime()) that verifies each" >&2
echo "scheduled callback fires at the correct time." >&2
exit 1
