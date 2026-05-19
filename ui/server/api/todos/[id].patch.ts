/**
 * PATCH /api/todos/:id
 *
 * Partial update — title and/or status.
 * Body: { title?: string, status?: 'active' | 'completed' }
 * Returns 200 with the updated Todo resource.
 * Returns 404 if not found.
 * Returns 422 on invalid title.
 */

interface TodoRow {
  id: string
  title: string
  status: 'active' | 'completed'
  created_at: string
  updated_at: string
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      data: { error: 'BAD_REQUEST', message: 'Missing todo id.' },
    })
  }

  const body = await readJsonBody(event) as Record<string, unknown> | null
  if (!body || typeof body !== 'object') {
    throw createError({
      statusCode: 400,
      data: { error: 'BAD_REQUEST', message: 'Malformed request body.' },
    })
  }

  const db = getDb()
  const existing = db.prepare('SELECT * FROM todos WHERE id = ?').get(id) as TodoRow | undefined
  if (!existing) {
    throw createError({
      statusCode: 404,
      data: { error: 'TODO_NOT_FOUND', message: `Todo not found: ${id}` },
    })
  }

  let newTitle = existing.title
  let newStatus = existing.status

  // Process title update
  if ('title' in body) {
    if (typeof body.title !== 'string') {
      throw createError({
        statusCode: 400,
        data: { error: 'BAD_REQUEST', message: 'title must be a string.' },
      })
    }
    const trimmed = (body.title as string).trim()
    if (trimmed.length === 0) {
      throw createError({
        statusCode: 422,
        data: { error: 'INVALID_TITLE', message: 'Title must not be blank.' },
      })
    }
    if (trimmed.length > TODO_TITLE_MAX_LENGTH) {
      throw createError({
        statusCode: 422,
        data: {
          error: 'INVALID_TITLE',
          message: `Title must not exceed ${TODO_TITLE_MAX_LENGTH} characters.`,
        },
      })
    }
    newTitle = trimmed
  }

  // Process status update
  if ('status' in body) {
    if (typeof body.status !== 'string' || !VALID_STATUSES.has(body.status as string)) {
      throw createError({
        statusCode: 400,
        data: {
          error: 'BAD_REQUEST',
          message: 'status must be "active" or "completed".',
        },
      })
    }
    newStatus = body.status as 'active' | 'completed'
  }

  const now = new Date().toISOString()
  db.prepare(
    'UPDATE todos SET title = ?, status = ?, updated_at = ? WHERE id = ?',
  ).run(newTitle, newStatus, now, id)

  return {
    id: existing.id,
    title: newTitle,
    status: newStatus,
    createdAt: existing.created_at,
    updatedAt: now,
  }
})
