/**
 * Request parsing utilities compatible with h3 v1 (Nitro) and v2 (Nuxt Vite).
 *
 * Avoids using getQuery() which broke in h3 v2 RC when URL is relative.
 * Avoids relying on readBody() auto-import version conflicts.
 */
import type { H3Event } from 'h3'

/**
 * Parse query parameters from the raw request URL without using getQuery().
 * Works with both h3 v1 and v2.
 */
export function getQueryParams(event: H3Event): URLSearchParams {
  const rawUrl = (event.node?.req?.url ?? (event as Record<string, unknown>).path ?? '') as string
  const qIndex = rawUrl.indexOf('?')
  const searchStr = qIndex >= 0 ? rawUrl.slice(qIndex + 1) : ''
  return new URLSearchParams(searchStr)
}

/**
 * Read and parse JSON request body directly from the Node.js stream.
 * Returns null on failure (empty body, invalid JSON, etc.).
 */
export async function readJsonBody(event: H3Event): Promise<unknown> {
  const req = event.node.req
  // Check content type
  const ct = req.headers['content-type'] ?? ''
  if (!ct.includes('json') && !ct.includes('text/plain')) {
    return null
  }
  return new Promise<unknown>((resolve) => {
    let data = ''
    req.on('data', (chunk: Buffer) => { data += chunk.toString('utf8') })
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : null)
      } catch {
        resolve(null)
      }
    })
    req.on('error', () => resolve(null))
  })
}
