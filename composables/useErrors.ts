/** A displayable application error with auto-dismiss support. */
export interface AppError {
  id: string
  message: string
}

const ERROR_AUTO_DISMISS_MS = 5_000

/**
 * Global error notification state.
 * Errors auto-dismiss after ERROR_AUTO_DISMISS_MS milliseconds.
 */
export const useErrors = () => {
  const errors = useState<AppError[]>('errors', () => [])

  const removeError = (id: string) => {
    errors.value = errors.value.filter((e) => e.id !== id)
  }

  const addError = (message: string) => {
    const id = crypto.randomUUID()
    errors.value = [...errors.value, { id, message }]
    setTimeout(() => removeError(id), ERROR_AUTO_DISMISS_MS)
  }

  return { errors, addError, removeError }
}
