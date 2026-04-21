/**
 * Server-side error utilities.
 *
 * Provides typed helpers to create H3 errors that conform to the API
 * error envelope defined in the Interface Spec:
 *
 *   { "error": "ERROR_CODE_CONSTANT", "message": "Human-readable" }
 *
 * Usage:
 *   throw apiError(404, 'TODO_NOT_FOUND', 'Todo not found.')
 *   throw notFound()
 *   throw invalidTitle(err.message)
 */

import { createError } from 'h3'

export type ApiErrorCode =
  | 'TODO_NOT_FOUND'
  | 'INVALID_TITLE'
  | 'BAD_REQUEST'
  | 'INTERNAL_ERROR'

/** Create a typed H3 error with the standard API error envelope. */
export function apiError(
  statusCode: number,
  code: ApiErrorCode,
  message: string,
) {
  return createError({
    statusCode,
    data: { error: code, message },
    message,
  })
}

export const notFound = (message = 'Todo not found.') =>
  apiError(404, 'TODO_NOT_FOUND', message)

export const invalidTitle = (message: string) =>
  apiError(422, 'INVALID_TITLE', message)

export const badRequest = (message: string) =>
  apiError(400, 'BAD_REQUEST', message)

export const internalError = (message = 'An unexpected error occurred.') =>
  apiError(500, 'INTERNAL_ERROR', message)
