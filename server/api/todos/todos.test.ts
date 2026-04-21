/**
 * API route integration tests — /api/todos
 *
 * Tests the full HTTP contract as specified in specs/interface.spec.md.
 *
 * Strategy:
 *  - `getTodoRepository` is mocked to return a fresh in-memory SQLite repo
 *    for each test (isolated, no file I/O, no cleanup needed).
 *  - An H3 test app is constructed with all route handlers registered.
 *  - Requests are issued via `toWebHandler` (Web API Request/Response).
 *  - The test app's `onError` hook uses `formatApiError` to produce the
 *    spec-compliant error envelope, mirroring the production Nitro plugin.
 *
 * Test plan mirrors the TDD Plan in specs/interface.spec.md.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createApp,
  createRouter,
  toWebHandler,
  setResponseStatus,
  setHeader,
  send,
} from 'h3'
import type { H3Event } from 'h3'
import { openDatabase } from '../../infrastructure/persistence/DatabaseConnection.js'
import { MigrationRunner } from '../../infrastructure/persistence/MigrationRunner.js'
import { SqliteTodoRepository } from '../../infrastructure/persistence/SqliteTodoRepository.js'
import { Todo } from '../../domain/Todo.js'
import { TodoTitle } from '../../domain/value-objects/TodoTitle.js'
import { formatApiError } from '../../utils/errorFormatter.js'

// ---------------------------------------------------------------------------
// Mock — getTodoRepository
//
// vi.hoisted() ensures the mock function is created before vi.mock() runs
// (both are hoisted to the top of the file, but vi.hoisted runs first).
// ---------------------------------------------------------------------------

const { mockGetRepo } = vi.hoisted(() => ({
  mockGetRepo: vi.fn<[], SqliteTodoRepository>(),
}))

vi.mock('~/server/plugins/database', () => ({
  getTodoRepository: mockGetRepo,
}))

// Import handlers AFTER the mock is declared.
// vi.mock is hoisted so the mock is in place when the handlers are imported.
import todoListHandler from './index.get.js'
import todoCreateHandler from './index.post.js'
import todoBulkDeleteHandler from './index.delete.js'
import todoGetHandler from './[id].get.js'
import todoPatchHandler from './[id].patch.js'
import todoDeleteHandler from './[id].delete.js'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Open a fresh in-memory SQLite database and run all migrations. */
function freshRepo(): SqliteTodoRepository {
  const db = openDatabase(':memory:')
  new MigrationRunner(db).run()
  return new SqliteTodoRepository(db)
}

/**
 * Build an H3 test application with all todo route handlers registered.
 *
 * The `onError` hook uses `formatApiError` to produce the spec-compliant
 * error envelope:  { error: "ERROR_CODE", message: "..." }
 * (This mirrors what the Nitro `apiErrorHandler` plugin does in production.)
 */
function createTestApp() {
  const app = createApp({
    onError: async (error: unknown, event: H3Event) => {
      const { statusCode, body } = formatApiError(error)
      setResponseStatus(event, statusCode)
      setHeader(event, 'content-type', 'application/json')
      await send(event, JSON.stringify(body))
    },
  })

  const router = createRouter()
  router.get('/api/todos', todoListHandler)
  router.post('/api/todos', todoCreateHandler)
  router.delete('/api/todos', todoBulkDeleteHandler)
  router.get('/api/todos/:id', todoGetHandler)
  router.patch('/api/todos/:id', todoPatchHandler)
  router.delete('/api/todos/:id', todoDeleteHandler)
  app.use(router)

  return toWebHandler(app)
}

// Test-scoped state — reset per test via beforeEach
let handle: ReturnType<typeof toWebHandler>
let repo: SqliteTodoRepository

/** Convenience: make an HTTP request against the test app. */
function req(path: string, init?: RequestInit): Promise<Response> {
  return handle(new Request(`http://localhost${path}`, init))
}

/** Parse JSON from a Response. */
async function json<T = unknown>(response: Response): Promise<T> {
  return response.json() as Promise<T>
}

/** JSON POST/PATCH helper. */
function jsonBody(data: unknown): RequestInit {
  return {
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data),
  }
}

/** Seed a single active todo into the repo. */
function seedTodo(title = 'Test todo'): Todo {
  const todo = Todo.create(new TodoTitle(title))
  repo.save(todo)
  return todo
}

/** Seed a completed todo into the repo. */
function seedCompletedTodo(title = 'Done todo'): Todo {
  const todo = Todo.create(new TodoTitle(title))
  todo.complete()
  repo.save(todo)
  return todo
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  repo = freshRepo()
  mockGetRepo.mockReturnValue(repo)
  handle = createTestApp()
})

// ---------------------------------------------------------------------------
// GET /api/todos
// ---------------------------------------------------------------------------

describe('GET /api/todos', () => {
  it('returns empty todos array and zero counts when no todos exist', async () => {
    const res = await req('/api/todos')

    expect(res.status).toBe(200)
    const data = await json<{ todos: unknown[]; counts: Record<string, number> }>(res)
    expect(data.todos).toEqual([])
    expect(data.counts).toEqual({ all: 0, active: 0, completed: 0 })
  })

  it('returns all todos with correct resource shape', async () => {
    const todo = seedTodo('Buy groceries')

    const res = await req('/api/todos')
    const data = await json<{ todos: Array<Record<string, string>> }>(res)

    expect(data.todos).toHaveLength(1)
    expect(data.todos[0]).toMatchObject({
      id: todo.id,
      title: 'Buy groceries',
      status: 'active',
    })
    expect(data.todos[0]!.createdAt).toBeTruthy()
    expect(data.todos[0]!.updatedAt).toBeTruthy()
  })

  it('filter=active excludes completed todos from list but counts reflect all', async () => {
    seedTodo('Active todo')
    seedCompletedTodo('Completed todo')

    const res = await req('/api/todos?filter=active')
    expect(res.status).toBe(200)

    const data = await json<{ todos: Array<{ status: string }>; counts: Record<string, number> }>(res)
    expect(data.todos).toHaveLength(1)
    expect(data.todos[0]!.status).toBe('active')

    // counts always reflect ALL todos, regardless of filter
    expect(data.counts.all).toBe(2)
    expect(data.counts.active).toBe(1)
    expect(data.counts.completed).toBe(1)
  })

  it('filter=completed excludes active todos from list', async () => {
    seedTodo('Active todo')
    seedCompletedTodo('Done todo')

    const res = await req('/api/todos?filter=completed')
    expect(res.status).toBe(200)

    const data = await json<{ todos: Array<{ status: string }> }>(res)
    expect(data.todos).toHaveLength(1)
    expect(data.todos[0]!.status).toBe('completed')
  })

  it('filter=all returns both active and completed todos', async () => {
    seedTodo('Active')
    seedCompletedTodo('Done')

    const res = await req('/api/todos?filter=all')
    const data = await json<{ todos: unknown[] }>(res)
    expect(data.todos).toHaveLength(2)
  })

  it('invalid filter value returns 400 BAD_REQUEST', async () => {
    const res = await req('/api/todos?filter=bogus')

    expect(res.status).toBe(400)
    const data = await json<{ error: string }>(res)
    expect(data.error).toBe('BAD_REQUEST')
  })

  it('todo list is ordered newest first (createdAt descending)', async () => {
    const first = Todo.create(new TodoTitle('First'))
    repo.save(first)

    // Ensure distinct timestamps
    await new Promise(r => setTimeout(r, 5))

    const second = Todo.create(new TodoTitle('Second'))
    repo.save(second)

    const res = await req('/api/todos')
    const data = await json<{ todos: Array<{ title: string }> }>(res)

    expect(data.todos[0]!.title).toBe('Second')
    expect(data.todos[1]!.title).toBe('First')
  })
})

// ---------------------------------------------------------------------------
// POST /api/todos
// ---------------------------------------------------------------------------

describe('POST /api/todos', () => {
  it('valid title returns 201 with full Todo resource including UUID v4 id', async () => {
    const res = await req('/api/todos', {
      method: 'POST',
      ...jsonBody({ title: 'Buy milk' }),
    })

    expect(res.status).toBe(201)
    const data = await json<Record<string, string>>(res)
    expect(data.title).toBe('Buy milk')
    expect(data.status).toBe('active')
    expect(data.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
    expect(data.createdAt).toBeTruthy()
    expect(data.updatedAt).toBeTruthy()
  })

  it('created todo is persisted and retrievable via GET', async () => {
    const createRes = await req('/api/todos', {
      method: 'POST',
      ...jsonBody({ title: 'Persist me' }),
    })
    const created = await json<{ id: string }>(createRes)

    const getRes = await req(`/api/todos/${created.id}`)
    expect(getRes.status).toBe(200)
    const fetched = await json<{ title: string }>(getRes)
    expect(fetched.title).toBe('Persist me')
  })

  it('empty title returns 422 with INVALID_TITLE error', async () => {
    const res = await req('/api/todos', {
      method: 'POST',
      ...jsonBody({ title: '' }),
    })

    expect(res.status).toBe(422)
    const data = await json<{ error: string }>(res)
    expect(data.error).toBe('INVALID_TITLE')
  })

  it('whitespace-only title returns 422 with INVALID_TITLE error', async () => {
    const res = await req('/api/todos', {
      method: 'POST',
      ...jsonBody({ title: '   ' }),
    })

    expect(res.status).toBe(422)
    const data = await json<{ error: string }>(res)
    expect(data.error).toBe('INVALID_TITLE')
  })

  it('missing title field returns 400 BAD_REQUEST', async () => {
    const res = await req('/api/todos', {
      method: 'POST',
      ...jsonBody({}),
    })

    expect(res.status).toBe(400)
    const data = await json<{ error: string }>(res)
    expect(data.error).toBe('BAD_REQUEST')
  })

  it('non-string title field returns 400 BAD_REQUEST', async () => {
    const res = await req('/api/todos', {
      method: 'POST',
      ...jsonBody({ title: 42 }),
    })

    expect(res.status).toBe(400)
    const data = await json<{ error: string }>(res)
    expect(data.error).toBe('BAD_REQUEST')
  })
})

// ---------------------------------------------------------------------------
// GET /api/todos/:id
// ---------------------------------------------------------------------------

describe('GET /api/todos/:id', () => {
  it('returns 200 with the Todo resource', async () => {
    const todo = seedTodo('Fetch me')

    const res = await req(`/api/todos/${todo.id}`)
    expect(res.status).toBe(200)

    const data = await json<Record<string, string>>(res)
    expect(data.id).toBe(todo.id)
    expect(data.title).toBe('Fetch me')
    expect(data.status).toBe('active')
    expect(data.createdAt).toBeTruthy()
    expect(data.updatedAt).toBeTruthy()
  })

  it('returns 404 TODO_NOT_FOUND for unknown id', async () => {
    const res = await req('/api/todos/00000000-0000-0000-0000-000000000000')

    expect(res.status).toBe(404)
    const data = await json<{ error: string }>(res)
    expect(data.error).toBe('TODO_NOT_FOUND')
  })
})

// ---------------------------------------------------------------------------
// PATCH /api/todos/:id
// ---------------------------------------------------------------------------

describe('PATCH /api/todos/:id', () => {
  it('status: "completed" marks an active todo as completed', async () => {
    const todo = seedTodo('Mark done')

    const res = await req(`/api/todos/${todo.id}`, {
      method: 'PATCH',
      ...jsonBody({ status: 'completed' }),
    })

    expect(res.status).toBe(200)
    const data = await json<{ status: string }>(res)
    expect(data.status).toBe('completed')
  })

  it('status: "active" reopens a completed todo', async () => {
    const todo = seedCompletedTodo('Reopen me')

    const res = await req(`/api/todos/${todo.id}`, {
      method: 'PATCH',
      ...jsonBody({ status: 'active' }),
    })

    expect(res.status).toBe(200)
    const data = await json<{ status: string }>(res)
    expect(data.status).toBe('active')
  })

  it('status: "completed" on already-completed todo returns 200 (idempotent)', async () => {
    const todo = seedCompletedTodo('Already done')

    const res = await req(`/api/todos/${todo.id}`, {
      method: 'PATCH',
      ...jsonBody({ status: 'completed' }),
    })

    expect(res.status).toBe(200)
    const data = await json<{ status: string }>(res)
    expect(data.status).toBe('completed')
  })

  it('updates title successfully', async () => {
    const todo = seedTodo('Old title')

    const res = await req(`/api/todos/${todo.id}`, {
      method: 'PATCH',
      ...jsonBody({ title: 'New title' }),
    })

    expect(res.status).toBe(200)
    const data = await json<{ title: string }>(res)
    expect(data.title).toBe('New title')
  })

  it('updates both title and status in a single request', async () => {
    const todo = seedTodo('Old')

    const res = await req(`/api/todos/${todo.id}`, {
      method: 'PATCH',
      ...jsonBody({ title: 'New', status: 'completed' }),
    })

    expect(res.status).toBe(200)
    const data = await json<{ title: string; status: string }>(res)
    expect(data.title).toBe('New')
    expect(data.status).toBe('completed')
  })

  it('unknown id returns 404 TODO_NOT_FOUND', async () => {
    const res = await req('/api/todos/00000000-0000-0000-0000-000000000000', {
      method: 'PATCH',
      ...jsonBody({ status: 'completed' }),
    })

    expect(res.status).toBe(404)
    const data = await json<{ error: string }>(res)
    expect(data.error).toBe('TODO_NOT_FOUND')
  })

  it('empty title returns 422 INVALID_TITLE', async () => {
    const todo = seedTodo('Valid title')

    const res = await req(`/api/todos/${todo.id}`, {
      method: 'PATCH',
      ...jsonBody({ title: '' }),
    })

    expect(res.status).toBe(422)
    const data = await json<{ error: string }>(res)
    expect(data.error).toBe('INVALID_TITLE')
  })

  it('unknown status value returns 400 BAD_REQUEST', async () => {
    const todo = seedTodo()

    const res = await req(`/api/todos/${todo.id}`, {
      method: 'PATCH',
      ...jsonBody({ status: 'bogus' }),
    })

    expect(res.status).toBe(400)
    const data = await json<{ error: string }>(res)
    expect(data.error).toBe('BAD_REQUEST')
  })
})

// ---------------------------------------------------------------------------
// DELETE /api/todos/:id
// ---------------------------------------------------------------------------

describe('DELETE /api/todos/:id', () => {
  it('existing todo returns 204 with no content', async () => {
    const todo = seedTodo('Delete me')

    const res = await req(`/api/todos/${todo.id}`, { method: 'DELETE' })

    expect(res.status).toBe(204)
  })

  it('deleted todo is no longer retrievable', async () => {
    const todo = seedTodo('Gone')

    await req(`/api/todos/${todo.id}`, { method: 'DELETE' })

    const getRes = await req(`/api/todos/${todo.id}`)
    expect(getRes.status).toBe(404)
  })

  it('unknown id returns 404 TODO_NOT_FOUND', async () => {
    const res = await req('/api/todos/00000000-0000-0000-0000-000000000000', {
      method: 'DELETE',
    })

    expect(res.status).toBe(404)
    const data = await json<{ error: string }>(res)
    expect(data.error).toBe('TODO_NOT_FOUND')
  })
})

// ---------------------------------------------------------------------------
// DELETE /api/todos?status=completed
// ---------------------------------------------------------------------------

describe('DELETE /api/todos?status=completed', () => {
  it('deletes all completed todos and returns correct deletedCount', async () => {
    seedTodo('Keep me (active)')
    seedCompletedTodo('Completed 1')
    seedCompletedTodo('Completed 2')

    const res = await req('/api/todos?status=completed', { method: 'DELETE' })

    expect(res.status).toBe(200)
    const data = await json<{ deletedCount: number }>(res)
    expect(data.deletedCount).toBe(2)

    // Active todo must still exist
    const listRes = await req('/api/todos')
    const listData = await json<{ todos: Array<{ status: string }> }>(listRes)
    expect(listData.todos).toHaveLength(1)
    expect(listData.todos[0]!.status).toBe('active')
  })

  it('returns 200 with deletedCount: 0 when no completed todos exist', async () => {
    seedTodo('Active only')

    const res = await req('/api/todos?status=completed', { method: 'DELETE' })

    expect(res.status).toBe(200)
    const data = await json<{ deletedCount: number }>(res)
    expect(data.deletedCount).toBe(0)
  })

  it('works on an empty store (no todos at all)', async () => {
    const res = await req('/api/todos?status=completed', { method: 'DELETE' })

    expect(res.status).toBe(200)
    const data = await json<{ deletedCount: number }>(res)
    expect(data.deletedCount).toBe(0)
  })

  it('missing status parameter returns 400 BAD_REQUEST', async () => {
    const res = await req('/api/todos', { method: 'DELETE' })

    expect(res.status).toBe(400)
    const data = await json<{ error: string }>(res)
    expect(data.error).toBe('BAD_REQUEST')
  })

  it('unsupported status value returns 400 BAD_REQUEST', async () => {
    const res = await req('/api/todos?status=active', { method: 'DELETE' })

    expect(res.status).toBe(400)
    const data = await json<{ error: string }>(res)
    expect(data.error).toBe('BAD_REQUEST')
  })
})
