/**
 * Pure error-formatting utility — maps any thrown value to a spec-compliant
 * API error envelope without touching the H3 event.
 *
 * Keeping this separate from the middleware makes it trivially unit-testable.
 */

import { isError } from 'h3'
import { InvalidTitleError } from '~~/server/domain/errors/InvalidTitleError'
import { TodoNotFoundError } from '~~/server/domain/errors/TodoNotFoundError'
import type { ApiErrorCode } from '~~/server/utils/errors'

/**
 * Generic human-readable message returned for any unhandled or unexpected
 * server error.  A single constant ensures the message is consistent and
 * avoids leaking internal framework details.
 */
const GENERIC_ERROR_MESSAGE = 'An unexpected error occurred.'

export interface ApiErrorBody {
  error: ApiErrorCode
  message: string
}

export interface FormattedApiError {
  statusCode: number
  body: ApiErrorBody
}

/** Derives a generic error code from an HTTP status code. */
function statusCodeToErrorCode(statusCode: number): ApiErrorCode {
  switch (statusCode) {
    case 404: return 'TODO_NOT_FOUND'
    case 422: return 'INVALID_TITLE'
    case 400: return 'BAD_REQUEST'
    default:  return 'INTERNAL_ERROR'
  }
}

/**
 * Maps any thrown value to a `{ statusCode, body }` tuple.
 *
 * Priority order:
 *  1. Domain errors — `InvalidTitleError` → 422, `TodoNotFoundError` → 404
 *  2. H3 errors created via `apiError()` (have `data.error`) — pass through
 *  3. Other H3 errors — derive code from status code
 *  4. Everything else — 500 INTERNAL_ERROR (also logs to console.error)
 */
export function formatApiError(err: unknown): FormattedApiError {
  // 1. Domain errors
  if (err instanceof InvalidTitleError) {
    return { statusCode: 422, body: { error: 'INVALID_TITLE', message: err.message } }
  }

  if (err instanceof TodoNotFoundError) {
    return { statusCode: 404, body: { error: 'TODO_NOT_FOUND', message: err.message } }
  }

  // 2 & 3. H3 errors
  if (isError(err)) {
    const data = err.data as { error?: ApiErrorCode; message?: string } | undefined

    if (data?.error) {
      // Our own apiError() envelope — pass through as-is.
      // Defensive fallback: if data.message is absent, return the safe generic
      // message rather than the raw H3 err.message which may contain internals.
      return {
        statusCode: err.statusCode,
        body: {
          error: data.error,
          message: data.message ?? GENERIC_ERROR_MESSAGE,
        },
      }
    }

    // Generic H3 error (from framework or middleware, not from our apiError() helper).
    // Return a safe generic message rather than `err.message` to prevent leaking
    // internal framework details (routing state, file paths, etc.) to clients.
    const statusCode = err.statusCode ?? 500
    return {
      statusCode,
      body: {
        error: statusCodeToErrorCode(statusCode),
        message: GENERIC_ERROR_MESSAGE,
      },
    }
  }

  // 4. Unknown error
  console.error('[api] Unhandled error:', err)
  return {
    statusCode: 500,
    body: { error: 'INTERNAL_ERROR', message: GENERIC_ERROR_MESSAGE },
  }
}
