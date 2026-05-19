/**
 * GET /api/todos/:id
 *
 * Fetch a single Todo by id.
 * Returns 200 with the Todo resource.
 * Returns 404 with TODO_NOT_FOUND if not found.
 */


interface TodoRow {
  id: string
  title: string
  status: 'active' | 'completed'
  created_at: string
  updated_at: string
}

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      data: { error: 'BAD_REQUEST', message: 'Missing todo id.' },
    })
  }

  const db = getDb()
  const row = db.prepare('SELECT * FROM todos WHERE id = ?').get(id) as TodoRow | undefined

  if (!row) {
    throw createError({
      statusCode: 404,
      data: { error: 'TODO_NOT_FOUND', message: `Todo not found: ${id}` },
    })
  }

  return {
    id: row.id,
    title: row.title,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
})
