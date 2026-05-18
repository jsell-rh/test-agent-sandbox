/** A single transient error notification. */
export interface AppError {
  id: string
  message: string
}

const ERROR_AUTO_DISMISS_MS = 5_000

/**
 * Shared error-notification state.
 * Errors are auto-dismissed after ERROR_AUTO_DISMISS_MS milliseconds.
 */
export function useErrors() {
  const errors = useState<AppError[]>('app:errors', () => [])

  function addError(message: string): void {
    const id = Math.random().toString(36).slice(2)
    errors.value = [...errors.value, { id, message }]

    // Auto-dismiss — only meaningful in the browser context.
    if (import.meta.client) {
      setTimeout(() => removeError(id), ERROR_AUTO_DISMISS_MS)
    }
  }

  function removeError(id: string): void {
    errors.value = errors.value.filter((e) => e.id !== id)
  }

  return { errors, addError, removeError }
}
