/**
 * Global error handler — converts unhandled errors into the API error envelope.
 *
 * Installs an `_errorHandler` function on the event context. Route handlers
 * should catch errors and delegate to `event.context._errorHandler(err)` so
 * that all error responses follow the spec-compliant envelope:
 *
 *   { "error": "ERROR_CODE_CONSTANT", "message": "Human-readable" }
 */

import { defineEventHandler, setResponseStatus, setHeader, send } from 'h3'
import { formatApiError } from '../utils/errorFormatter'

export default defineEventHandler((event) => {
  event.context._errorHandler = async (err: unknown) => {
    const { statusCode, body } = formatApiError(err)
    setResponseStatus(event, statusCode)
    setHeader(event, 'content-type', 'application/json')
    return send(event, JSON.stringify(body))
  }
})
