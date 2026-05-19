/**
 * GET /api/todos
 *
 * List all Todos with optional filtering.
 * Query params: filter=all|active|completed (default: all)
 * Returns: { todos: Todo[], counts: { all, active, completed } }
 */

interface TodoRow {
  id: string
  title: string
  status: 'active' | 'completed'
  created_at: string
  updated_at: string
}

interface CountsRow {
  all: number
  active: number
  completed: number
}

export default defineEventHandler((event) => {
  const params = getQueryParams(event)
  const filter = params.get('filter') ?? 'all'

  if (!VALID_FILTERS.has(filter)) {
    throw createError({
      statusCode: 400,
      data: { error: 'BAD_REQUEST', message: `Invalid filter value: ${filter}. Must be all, active, or completed.` },
    })
  }

  const db = getDb()

  let todos: TodoRow[]
  if (filter === 'all') {
    todos = db.prepare('SELECT * FROM todos ORDER BY created_at DESC').all() as TodoRow[]
  } else {
    todos = db
      .prepare('SELECT * FROM todos WHERE status = ? ORDER BY created_at DESC')
      .all(filter) as TodoRow[]
  }

  // Always compute counts over ALL todos regardless of filter
  // Note: 'all' is a SQLite reserved word — quote it
  const counts = db
    .prepare(`
      SELECT
        COUNT(*) AS "all",
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
      FROM todos
    `)
    .get() as CountsRow

  return {
    todos: todos.map(rowToTodo),
    counts: {
      all: counts.all ?? 0,
      active: counts.active ?? 0,
      completed: counts.completed ?? 0,
    },
  }
})

function rowToTodo(row: TodoRow) {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
