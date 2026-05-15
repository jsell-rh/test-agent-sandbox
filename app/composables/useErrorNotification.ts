/**
 * useErrorNotification — error notification state machine.
 *
 * Spec (specs/interface.spec.md § Non-Functional Requirements):
 *   "API errors surfaced to user as non-blocking inline messages;
 *    auto-dismiss after 5s"
 *
 * State:
 *   errorMessage — the current error string, or null when no error is active.
 *
 * Actions:
 *   showError(message)  — set errorMessage and schedule auto-dismiss after
 *                         ERROR_DISMISS_MS. Cancels any pending dismiss timer
 *                         so rapid errors reset the countdown.
 *   dismissError()      — clear errorMessage immediately and cancel any timer.
 *
 * Design:
 *   The composable owns only state and timer management.
 *   The consumer (index.vue) is responsible for rendering the
 *   ErrorNotification component when errorMessage is non-null and passing
 *   dismissError as the handler for the `dismiss` event.
 */

import { ref } from 'vue'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Duration in milliseconds before an error notification is automatically
 * dismissed.  Exported so tests can reference the exact value without
 * hardcoding a magic number.
 */
export const ERROR_DISMISS_MS = 5000

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useErrorNotification() {
  /** The active error message, or null when no error is displayed. */
  const errorMessage = ref<string | null>(null)

  /**
   * Handle to the pending auto-dismiss timer.
   *
   * An instance-level closure variable (not a ref) because it never needs to
   * drive template rendering — it is purely an implementation detail of timer
   * lifecycle management.  Each call to useErrorNotification() gets its own
   * independent timer handle.
   */
  let dismissTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * Display an error message and schedule its automatic dismissal.
   *
   * If a message is already visible, the previous timer is cancelled and a
   * new ERROR_DISMISS_MS countdown begins.  This ensures rapid errors
   * each get a full ERROR_DISMISS_MS-millisecond window.
   *
   * @param message - The human-readable error string to display.
   */
  function showError(message: string): void {
    if (dismissTimer !== null) {
      clearTimeout(dismissTimer)
      dismissTimer = null
    }

    errorMessage.value = message

    dismissTimer = setTimeout(() => {
      errorMessage.value = null
      dismissTimer = null
    }, ERROR_DISMISS_MS)
  }

  /**
   * Immediately clear the error message and cancel any pending dismiss timer.
   *
   * Safe to call when no error is active (no-op).
   */
  function dismissError(): void {
    if (dismissTimer !== null) {
      clearTimeout(dismissTimer)
      dismissTimer = null
    }
    errorMessage.value = null
  }

  return { errorMessage, showError, dismissError }
}
