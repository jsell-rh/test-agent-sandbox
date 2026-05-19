/**
 * DELETE /api/todos/:id
 *
 * Permanently delete a single Todo.
 * Returns 204 on success.
 * Returns 404 if not found.
 */


interface TodoRow {
  id: string
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
  const existing = db.prepare('SELECT id FROM todos WHERE id = ?').get(id) as TodoRow | undefined
  if (!existing) {
    throw createError({
      statusCode: 404,
      data: { error: 'TODO_NOT_FOUND', message: `Todo not found: ${id}` },
    })
  }

  db.prepare('DELETE FROM todos WHERE id = ?').run(id)

  setResponseStatus(event, 204)
  return null
})
