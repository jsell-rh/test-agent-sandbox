/**
 * Global error handler — converts unhandled errors into the API error envelope.
 *
 * Runs after all route handlers. If a response has already been sent this
 * middleware is a no-op.
 */

import { defineEventHandler, isError, sendError, createError } from 'h3'
import type { ApiErrorCode } from '~/server/utils/errors'

export default defineEventHandler(async (event) => {
  event.context._errorHandler = async (err: unknown) => {
    // If the error already has a typed data envelope from apiError(), pass through.
    if (isError(err) && (err.data as { error?: ApiErrorCode })?.error) {
      sendError(event, err)
      return
    }

    // Otherwise wrap in INTERNAL_ERROR.
    const wrapped = createError({
      statusCode: 500,
      data: { error: 'INTERNAL_ERROR' as ApiErrorCode, message: 'An unexpected error occurred.' },
      message: 'An unexpected error occurred.',
    })
    sendError(event, wrapped)
  }
})
