/**
 * POST /api/todos
 *
 * Create a new Todo.
 * Body: { title: string }
 * Returns 201 with the created Todo resource.
 * Returns 422 with INVALID_TITLE on blank/too-long title.
 */

import { v4 as uuidv4 } from 'uuid'

export default defineEventHandler(async (event) => {
  const body = await readJsonBody(event) as Record<string, unknown> | null

  if (!body || typeof body.title !== 'string') {
    throw createError({
      statusCode: 400,
      data: { error: 'BAD_REQUEST', message: 'Request body must include a title string.' },
    })
  }

  const rawTitle: string = body.title
  const title = rawTitle.trim()

  if (title.length === 0) {
    throw createError({
      statusCode: 422,
      data: { error: 'INVALID_TITLE', message: 'Title must not be blank.' },
    })
  }

  if (title.length > TODO_TITLE_MAX_LENGTH) {
    throw createError({
      statusCode: 422,
      data: {
        error: 'INVALID_TITLE',
        message: `Title must not exceed ${TODO_TITLE_MAX_LENGTH} characters.`,
      },
    })
  }

  const now = new Date().toISOString()
  const id = uuidv4()

  const db = getDb()
  db.prepare(
    'INSERT INTO todos (id, title, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
  ).run(id, title, 'active', now, now)

  // Set 201 Created via both h3 API and raw Node.js (handles h3 v1/v2 differences)
  setResponseStatus(event, 201)
  event.node.res.statusCode = 201
  return {
    id,
    title,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  }
})
