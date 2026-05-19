/**
 * DELETE /api/todos?status=completed
 *
 * Bulk delete all completed Todos ("Clear completed" action).
 * Returns: { deletedCount: number }
 */

export default defineEventHandler((event) => {
  const params = getQueryParams(event)
  const status = params.get('status')

  if (status !== 'completed') {
    throw createError({
      statusCode: 400,
      data: { error: 'BAD_REQUEST', message: 'Only status=completed is supported for bulk delete.' },
    })
  }

  const db = getDb()
  const result = db.prepare("DELETE FROM todos WHERE status = 'completed'").run()

  return {
    deletedCount: result.changes,
  }
})
