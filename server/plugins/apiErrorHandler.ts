/**
 * Nitro plugin — catches unhandled errors from API routes and converts them to
 * the spec-compliant error envelope:
 *
 *   { "error": "ERROR_CODE_CONSTANT", "message": "Human-readable" }
 *
 * This acts as a safety net for errors that bubble all the way up to Nitro
 * without being caught by a route handler's own try/catch.
 */

import { setResponseStatus, setHeader, send } from 'h3'
import { formatApiError } from '~/server/utils/errorFormatter'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', async (error, { event }) => {
    // Only intercept API routes
    if (!event || !event.path?.startsWith('/api/')) {
      return
    }

    const { statusCode, body } = formatApiError(error)
    setResponseStatus(event, statusCode)
    setHeader(event, 'content-type', 'application/json')
    await send(event, JSON.stringify(body))
    event.handled = true
  })
})
