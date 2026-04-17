/**
 * useApiError — composable for normalising API errors.
 *
 * Converts raw fetch errors and structured API error envelopes
 * ({ error, message }) into a human-readable string suitable for
 * display in AppErrorBanner.
 */

interface ApiErrorEnvelope {
  error: string
  message: string
}

function isApiErrorEnvelope(value: unknown): value is ApiErrorEnvelope {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    'message' in value
  )
}

export function useApiError() {
  const errorMessage = ref<string | null>(null)

  function setError(err: unknown): void {
    if (err instanceof Error) {
      errorMessage.value = err.message
    } else if (isApiErrorEnvelope(err)) {
      errorMessage.value = err.message
    } else if (typeof err === 'string') {
      errorMessage.value = err
    } else {
      errorMessage.value = 'An unexpected error occurred.'
    }
  }

  function clearError(): void {
    errorMessage.value = null
  }

  return { errorMessage: readonly(errorMessage), setError, clearError }
}
