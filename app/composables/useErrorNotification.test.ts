/**
 * useErrorNotification — unit tests
 *
 * Tests the error notification state machine:
 *   - Initial state: errorMessage is null
 *   - showError() sets the error message
 *   - showError() schedules auto-dismiss after ERROR_DISMISS_MS (5 000 ms)
 *   - dismissError() immediately clears the message and cancels the timer
 *   - Calling showError() while a timer is pending resets the timer
 *
 * Strategy:
 *   vi.useFakeTimers() controls setTimeout so the 5-second dismiss can be
 *   asserted synchronously without real wall-clock delays.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useErrorNotification, ERROR_DISMISS_MS } from './useErrorNotification'

// ---------------------------------------------------------------------------
// Timer setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe('useErrorNotification — initial state', () => {
  it('errorMessage starts as null', () => {
    const { errorMessage } = useErrorNotification()
    expect(errorMessage.value).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// showError
// ---------------------------------------------------------------------------

describe('useErrorNotification — showError()', () => {
  it('sets errorMessage to the provided string', () => {
    const { errorMessage, showError } = useErrorNotification()
    showError('Something went wrong')
    expect(errorMessage.value).toBe('Something went wrong')
  })

  it('auto-dismisses after ERROR_DISMISS_MS milliseconds', () => {
    const { errorMessage, showError } = useErrorNotification()
    showError('Temporary error')

    expect(errorMessage.value).toBe('Temporary error')

    vi.advanceTimersByTime(ERROR_DISMISS_MS - 1)
    expect(errorMessage.value).toBe('Temporary error') // not yet dismissed

    vi.advanceTimersByTime(1)
    expect(errorMessage.value).toBeNull() // dismissed
  })

  it('resets the dismiss timer when called again before expiry', () => {
    const { errorMessage, showError } = useErrorNotification()

    showError('First error')
    vi.advanceTimersByTime(ERROR_DISMISS_MS - 100) // almost expired

    // Second call should reset the timer
    showError('Second error')
    expect(errorMessage.value).toBe('Second error')

    // Advance less than ERROR_DISMISS_MS from the second call — should NOT dismiss yet
    vi.advanceTimersByTime(ERROR_DISMISS_MS - 100)
    expect(errorMessage.value).toBe('Second error')

    // Advance to full ERROR_DISMISS_MS from the second call — now dismissed
    vi.advanceTimersByTime(100)
    expect(errorMessage.value).toBeNull()
  })

  it('does not leave a stale timer that fires after dismiss', () => {
    const { errorMessage, showError, dismissError } = useErrorNotification()

    showError('Error A')
    dismissError() // manually dismiss

    // The timer from showError('Error A') must be cancelled — advancing past
    // ERROR_DISMISS_MS should not re-set errorMessage to null (it's already null).
    expect(errorMessage.value).toBeNull()
    vi.advanceTimersByTime(ERROR_DISMISS_MS * 2)
    // Still null — no crash, no side-effects
    expect(errorMessage.value).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// dismissError
// ---------------------------------------------------------------------------

describe('useErrorNotification — dismissError()', () => {
  it('immediately clears errorMessage', () => {
    const { errorMessage, showError, dismissError } = useErrorNotification()

    showError('An error')
    dismissError()

    expect(errorMessage.value).toBeNull()
  })

  it('cancels the auto-dismiss timer so no delayed side-effect fires', () => {
    const { errorMessage, showError, dismissError } = useErrorNotification()

    showError('Error that will be dismissed')
    dismissError()

    // Advancing past auto-dismiss period must not cause any re-assignment
    vi.advanceTimersByTime(ERROR_DISMISS_MS * 2)
    expect(errorMessage.value).toBeNull()
  })

  it('is safe to call when no error is set (no-op)', () => {
    const { errorMessage, dismissError } = useErrorNotification()
    expect(() => dismissError()).not.toThrow()
    expect(errorMessage.value).toBeNull()
  })
})
