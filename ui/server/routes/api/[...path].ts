/**
 * API proxy — forwards /api/** requests to the backend server.
 *
 * This allows the Nuxt dev server to act as a unified host during
 * development without CORS complications.  In production, a reverse
 * proxy (nginx, Caddy) should handle routing at the infrastructure level.
 *
 * Backend base URL is configured via the API_BASE_URL environment variable
 * (default: http://localhost:3001).
 */
import { H3Event, proxyRequest } from 'h3'

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig(event)
  const upstreamBase = config.apiBaseUrl as string

  const path = event.path ?? '/'
  const target = `${upstreamBase}${path}`

  return proxyRequest(event, target)
})
