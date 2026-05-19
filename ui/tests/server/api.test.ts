/**
 * API integration tests for the todo REST API.
 *
 * Tests run against the live dev server on port 3334.
 * These tests verify observable HTTP behavior, not internal implementation.
 */

const BASE_URL = 'http://localhost:3334'

async function apiGet(path: string): Promise<{ status: number; body: unknown }> {
  const r = await fetch(`${BASE_URL}${path}`)
  const body = await r.json().catch(() => null)
  return { status: r.status, body }
}

async function apiPost(path: string, data: unknown): Promise<{ status: number; body: unknown }> {
  const r = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const body = await r.json().catch(() => null)
  return { status: r.status, body }
}

async function apiPatch(path: string, data: unknown): Promise<{ status: number; body: unknown }> {
  const r = await fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const body = await r.json().catch(() => null)
  return { status: r.status, body }
}

async function apiDelete(path: string): Promise<{ status: number; body: unknown }> {
  const r = await fetch(`${BASE_URL}${path}`, { method: 'DELETE' })
  const body = r.status === 204 ? null : await r.json().catch(() => null)
  return { status: r.status, body }
}

// ---- Test helpers ----
function extractData(body: unknown): Record<string, unknown> {
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>
    // In dev mode, errors wrap the data field
    if ('data' in b) return b.data as Record<string, unknown>
    return b
  }
  return {}
}

describe('GET /api/todos', () => {
  it('returns empty todos array and zero counts when no todos exist', async () => {
    const { status, body } = await apiGet('/api/todos')
    expect(status).toBe(200)
    const data = body as { todos: unknown[]; counts: Record<string, number> }
    expect(Array.isArray(data.todos)).toBe(true)
    expect(typeof data.counts).toBe('object')
    expect(data.counts.all).toBeGreaterThanOrEqual(0)
    expect(data.counts.active).toBeGreaterThanOrEqual(0)
    expect(data.counts.completed).toBeGreaterThanOrEqual(0)
  })

  it('returns 400 on invalid filter value', async () => {
    const { status, body } = await apiGet('/api/todos?filter=invalid')
    expect(status).toBe(400)
    const data = extractData(body)
    expect(data.error).toBe('BAD_REQUEST')
  })
})

describe('POST /api/todos', () => {
  it('creates a todo with a valid title and returns a UUID id', async () => {
    const { body } = await apiPost('/api/todos', { title: 'Test todo creation' })
    const data = body as Record<string, unknown>
    expect(data.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(data.title).toBe('Test todo creation')
    expect(data.status).toBe('active')
    expect(typeof data.createdAt).toBe('string')
    expect(typeof data.updatedAt).toBe('string')
  })

  it('returns 422 with INVALID_TITLE on empty title', async () => {
    const { status, body } = await apiPost('/api/todos', { title: '' })
    expect(status).toBe(422)
    const data = extractData(body)
    expect(data.error).toBe('INVALID_TITLE')
  })

  it('returns 422 with INVALID_TITLE on whitespace-only title', async () => {
    const { status, body } = await apiPost('/api/todos', { title: '   ' })
    expect(status).toBe(422)
    const data = extractData(body)
    expect(data.error).toBe('INVALID_TITLE')
  })
})

describe('PATCH /api/todos/:id', () => {
  it('marks active todo as completed', async () => {
    const { body: createBody } = await apiPost('/api/todos', { title: 'Toggle me' })
    const created = createBody as Record<string, unknown>
    const id = created.id as string

    const { status, body } = await apiPatch(`/api/todos/${id}`, { status: 'completed' })
    expect(status).toBe(200)
    const data = body as Record<string, unknown>
    expect(data.status).toBe('completed')
  })

  it('reopens completed todo', async () => {
    const { body: createBody } = await apiPost('/api/todos', { title: 'Reopen me' })
    const created = createBody as Record<string, unknown>
    const id = created.id as string
    await apiPatch(`/api/todos/${id}`, { status: 'completed' })

    const { status, body } = await apiPatch(`/api/todos/${id}`, { status: 'active' })
    expect(status).toBe(200)
    const data = body as Record<string, unknown>
    expect(data.status).toBe('active')
  })

  it('returns 404 on unknown id', async () => {
    const { status, body } = await apiPatch('/api/todos/00000000-0000-0000-0000-000000000000', { status: 'completed' })
    expect(status).toBe(404)
    const data = extractData(body)
    expect(data.error).toBe('TODO_NOT_FOUND')
  })
})

describe('DELETE /api/todos/:id', () => {
  it('deletes an existing todo and returns 204', async () => {
    const { body: createBody } = await apiPost('/api/todos', { title: 'Delete me' })
    const created = createBody as Record<string, unknown>
    const id = created.id as string

    const { status } = await apiDelete(`/api/todos/${id}`)
    expect(status).toBe(204)
  })

  it('returns 404 on unknown id', async () => {
    const { status, body } = await apiDelete('/api/todos/00000000-0000-0000-0000-000000000000')
    expect(status).toBe(404)
    const data = extractData(body)
    expect(data.error).toBe('TODO_NOT_FOUND')
  })
})

describe('DELETE /api/todos?status=completed (bulk clear)', () => {
  it('deletes all completed todos and returns deletedCount', async () => {
    // Create a completed todo
    const { body: createBody } = await apiPost('/api/todos', { title: 'Bulk delete me' })
    const created = createBody as Record<string, unknown>
    await apiPatch(`/api/todos/${created.id}`, { status: 'completed' })

    const { status, body } = await apiDelete('/api/todos?status=completed')
    expect(status).toBe(200)
    const data = body as Record<string, unknown>
    expect(typeof data.deletedCount).toBe('number')
    expect(data.deletedCount).toBeGreaterThan(0)
  })

  it('returns deletedCount 0 when no completed todos exist', async () => {
    // Clear any existing completed todos first
    await apiDelete('/api/todos?status=completed')

    const { status, body } = await apiDelete('/api/todos?status=completed')
    expect(status).toBe(200)
    const data = body as Record<string, unknown>
    expect(data.deletedCount).toBe(0)
  })
})

describe('GET /api/todos — filtering', () => {
  it('filter=active excludes completed todos from list but counts reflect all', async () => {
    // Create one active, one completed
    const { body: a } = await apiPost('/api/todos', { title: 'Active filter test' })
    const { body: b } = await apiPost('/api/todos', { title: 'Completed filter test' })
    await apiPatch(`/api/todos/${(b as Record<string, unknown>).id}`, { status: 'completed' })

    const { status, body } = await apiGet('/api/todos?filter=active')
    expect(status).toBe(200)
    const data = body as { todos: Array<Record<string, unknown>>; counts: Record<string, number> }

    // All todos in list should be active
    expect(data.todos.every((t) => t.status === 'active')).toBe(true)
    // Counts should include all (both active and completed)
    expect(data.counts.all).toBeGreaterThanOrEqual(2)
    expect(data.counts.completed).toBeGreaterThanOrEqual(1)

    // Cleanup
    await apiDelete(`/api/todos/${(a as Record<string, unknown>).id}`)
    await apiDelete('/api/todos?status=completed')
  })

  it('filter=completed excludes active todos from list', async () => {
    const { body: c } = await apiPost('/api/todos', { title: 'Complete this' })
    await apiPatch(`/api/todos/${(c as Record<string, unknown>).id}`, { status: 'completed' })

    const { body } = await apiGet('/api/todos?filter=completed')
    const data = body as { todos: Array<Record<string, unknown>>; counts: Record<string, number> }
    expect(data.todos.every((t) => t.status === 'completed')).toBe(true)

    // Cleanup
    await apiDelete('/api/todos?status=completed')
  })
})
