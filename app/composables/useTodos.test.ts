/**
 * useTodos composable — unit tests
 *
 * Tests the UI state machine defined in specs/interface.spec.md:
 *   - Initial state (todos[], filter, editingTodoId)
 *   - loadTodos() populates todos[] from the API response
 *   - filteredTodos computed follows the active FilterCriteria
 *   - counts computed reflects the full todos[], not the filtered view
 *   - toggleTodo() optimistic update + rollback on API error
 *   - deleteTodo() optimistic removal + rollback on API error
 *   - updateTodoTitle() patches title and clears editingTodoId
 *   - startEditing() / cancelEditing() manage editingTodoId
 *
 * Strategy:
 *   A fake apiFetch function is injected via the optional parameter so tests
 *   exercise real behaviour without touching the network or Nuxt globals.
 */

import { describe, it, expect, vi } from 'vitest'
import {
  useTodos,
  FILTER_ALL,
  FILTER_ACTIVE,
  FILTER_COMPLETED,
  API_TODOS_PATH,
  apiTodoPath,
} from './useTodos'
import type { TodoResource, TodoListResponse, ApiFetchFn } from './useTodos'

// ---------------------------------------------------------------------------
// Fake helpers
// ---------------------------------------------------------------------------

function makeTodo(overrides: Partial<TodoResource> = {}): TodoResource {
  return {
    id: 'aaaaaaaa-0000-4000-8000-000000000001',
    title: 'Test todo',
    status: FILTER_ACTIVE,
    createdAt: '2024-01-01T10:00:00.000Z',
    updatedAt: '2024-01-01T10:00:00.000Z',
    ...overrides,
  }
}

function fakeResponse(todos: TodoResource[]): TodoListResponse {
  const active = todos.filter(t => t.status === FILTER_ACTIVE).length
  const completed = todos.filter(t => t.status === FILTER_COMPLETED).length
  return {
    todos,
    counts: { all: todos.length, active, completed },
  }
}

/**
 * Build a fake ApiFetchFn from a sequence of per-call resolvers.
 *
 * Each call to the returned function pops the next resolver off the queue.
 * Unconfigured calls throw to surface unexpected API interactions in tests.
 */
function makeApiFetch(calls: Array<() => Promise<unknown>>): ApiFetchFn {
  const queue = [...calls]
  return vi.fn((_url: string, _opts?: unknown) => {
    const next = queue.shift()
    if (!next) throw new Error('Unexpected apiFetch call — add more resolvers to makeApiFetch')
    return next() as Promise<never>
  })
}

/** Builds a fake that always resolves with `response` for every call. */
function makeSimpleFetch(response: unknown): ApiFetchFn {
  return vi.fn().mockResolvedValue(response)
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe('useTodos — initial state', () => {
  it('todos[] starts empty', () => {
    const { todos } = useTodos(makeSimpleFetch(fakeResponse([])))
    expect(todos.value).toEqual([])
  })

  it('filter starts as "all"', () => {
    const { filter } = useTodos(makeSimpleFetch(fakeResponse([])))
    expect(filter.value).toBe(FILTER_ALL)
  })

  it('editingTodoId starts as null', () => {
    const { editingTodoId } = useTodos(makeSimpleFetch(fakeResponse([])))
    expect(editingTodoId.value).toBeNull()
  })

  it('filteredTodos starts empty', () => {
    const { filteredTodos } = useTodos(makeSimpleFetch(fakeResponse([])))
    expect(filteredTodos.value).toEqual([])
  })

  it('counts start at zero', () => {
    const { counts } = useTodos(makeSimpleFetch(fakeResponse([])))
    expect(counts.value).toEqual({ all: 0, active: 0, completed: 0 })
  })
})

// ---------------------------------------------------------------------------
// loadTodos
// ---------------------------------------------------------------------------

describe('useTodos — loadTodos()', () => {
  it('populates todos[] with the API response', async () => {
    const todo = makeTodo({ title: 'Buy milk' })
    const fetch = makeSimpleFetch(fakeResponse([todo]))
    const { todos, loadTodos } = useTodos(fetch)

    await loadTodos()

    expect(todos.value).toHaveLength(1)
    expect(todos.value[0]).toMatchObject({ title: 'Buy milk', status: 'active' })
  })

  it('calls the API endpoint', async () => {
    const fetch = makeSimpleFetch(fakeResponse([]))
    const { loadTodos } = useTodos(fetch)

    await loadTodos()

    expect(fetch).toHaveBeenCalledOnce()
    expect(fetch).toHaveBeenCalledWith(API_TODOS_PATH)
  })

  it('replaces existing todos[] on second call', async () => {
    const first = makeTodo({ id: '00000000-0000-4000-8000-000000000001', title: 'First' })
    const second = makeTodo({ id: '00000000-0000-4000-8000-000000000002', title: 'Second' })

    const fetch = makeApiFetch([
      () => Promise.resolve(fakeResponse([first])),
      () => Promise.resolve(fakeResponse([second])),
    ])

    const { todos, loadTodos } = useTodos(fetch)

    await loadTodos()
    expect(todos.value).toHaveLength(1)
    expect(todos.value[0]!.title).toBe('First')

    await loadTodos()
    expect(todos.value).toHaveLength(1)
    expect(todos.value[0]!.title).toBe('Second')
  })

  it('preserves API ordering (createdAt DESC from server)', async () => {
    const older = makeTodo({
      id: '00000000-0000-4000-8000-000000000001',
      title: 'Older',
      createdAt: '2024-01-01T09:00:00.000Z',
    })
    const newer = makeTodo({
      id: '00000000-0000-4000-8000-000000000002',
      title: 'Newer',
      createdAt: '2024-01-01T10:00:00.000Z',
    })
    // API returns newest first
    const fetch = makeSimpleFetch(fakeResponse([newer, older]))
    const { todos, loadTodos } = useTodos(fetch)

    await loadTodos()

    expect(todos.value[0]!.title).toBe('Newer')
    expect(todos.value[1]!.title).toBe('Older')
  })
})

// ---------------------------------------------------------------------------
// filteredTodos — client-side filter (no additional network request)
// ---------------------------------------------------------------------------

describe('useTodos — filteredTodos computed', () => {
  async function setupWithMixed() {
    const active = makeTodo({
      id: '00000000-0000-4000-8000-000000000001',
      title: 'Active task',
      status: 'active',
    })
    const completed = makeTodo({
      id: '00000000-0000-4000-8000-000000000002',
      title: 'Done task',
      status: 'completed',
    })
    const fetch = makeSimpleFetch(fakeResponse([active, completed]))
    const state = useTodos(fetch)
    await state.loadTodos()
    return state
  }

  it('filter=all returns all todos', async () => {
    const { filter, filteredTodos } = await setupWithMixed()
    filter.value = FILTER_ALL
    expect(filteredTodos.value).toHaveLength(2)
  })

  it('filter=active excludes completed todos', async () => {
    const { filter, filteredTodos } = await setupWithMixed()
    filter.value = FILTER_ACTIVE
    expect(filteredTodos.value).toHaveLength(1)
    expect(filteredTodos.value[0]!.status).toBe('active')
  })

  it('filter=completed excludes active todos', async () => {
    const { filter, filteredTodos } = await setupWithMixed()
    filter.value = FILTER_COMPLETED
    expect(filteredTodos.value).toHaveLength(1)
    expect(filteredTodos.value[0]!.status).toBe('completed')
  })

  it('switching filter requires no additional fetch call', async () => {
    const fetch = makeSimpleFetch(
      fakeResponse([
        makeTodo({ status: 'active' }),
        makeTodo({ id: '00000000-0000-4000-8000-000000000002', status: 'completed' }),
      ]),
    )
    const { filter, filteredTodos, loadTodos } = useTodos(fetch)
    await loadTodos()

    // Switching the filter must not trigger another fetch
    filter.value = FILTER_ACTIVE
    expect(filteredTodos.value).toHaveLength(1)
    filter.value = FILTER_COMPLETED
    expect(filteredTodos.value).toHaveLength(1)
    filter.value = FILTER_ALL
    expect(filteredTodos.value).toHaveLength(2)

    // Only the initial loadTodos() should have called fetch
    expect(fetch).toHaveBeenCalledOnce()
  })
})

// ---------------------------------------------------------------------------
// counts computed
// ---------------------------------------------------------------------------

describe('useTodos — counts computed', () => {
  it('counts always reflect the full todos[], not the filtered view', async () => {
    const active = makeTodo({
      id: '00000000-0000-4000-8000-000000000001',
      status: 'active',
    })
    const completed = makeTodo({
      id: '00000000-0000-4000-8000-000000000002',
      status: 'completed',
    })
    const fetch = makeSimpleFetch(fakeResponse([active, completed]))
    const { filter, counts, loadTodos } = useTodos(fetch)
    await loadTodos()

    // Regardless of the filter, counts span the full list
    filter.value = FILTER_ACTIVE
    expect(counts.value).toEqual({ all: 2, active: 1, completed: 1 })

    filter.value = FILTER_COMPLETED
    expect(counts.value).toEqual({ all: 2, active: 1, completed: 1 })
  })
})

// ---------------------------------------------------------------------------
// toggleTodo — optimistic update + rollback
// ---------------------------------------------------------------------------

describe('useTodos — toggleTodo()', () => {
  const ACTIVE_ID = '00000000-0000-4000-8000-000000000001'
  const COMPLETED_ID = '00000000-0000-4000-8000-000000000002'

  /**
   * Set up a pair of todos in the composable and configure the PATCH response
   * for a specific toggle operation.
   */
  async function setupToggle(toggleId: string, patchResponse: TodoResource) {
    const activeTodo = makeTodo({ id: ACTIVE_ID, status: 'active', title: 'Active' })
    const completedTodo = makeTodo({ id: COMPLETED_ID, status: 'completed', title: 'Done' })

    const fetch = makeApiFetch([
      () => Promise.resolve(fakeResponse([activeTodo, completedTodo])),
      () => Promise.resolve(patchResponse),
    ])

    const state = useTodos(fetch)
    await state.loadTodos()
    return { ...state, fetch, toggleId }
  }

  it('optimistically flips status before API responds', async () => {
    const activeTodo = makeTodo({ id: ACTIVE_ID, status: 'active' })
    // Never-resolving PATCH so we can inspect mid-flight state
    let resolveToggle!: (v: TodoResource) => void
    const patchPromise = new Promise<TodoResource>(r => { resolveToggle = r })

    const fetch = makeApiFetch([
      () => Promise.resolve(fakeResponse([activeTodo])),
      () => patchPromise,
    ])
    const { todos, loadTodos, toggleTodo } = useTodos(fetch)
    await loadTodos()

    const togglePromise = toggleTodo(ACTIVE_ID)

    // Optimistic: status is flipped before API responds
    expect(todos.value[0]!.status).toBe('completed')

    resolveToggle({ ...activeTodo, status: 'completed' })
    await togglePromise
  })

  it('sends PATCH to the correct endpoint with toggled status', async () => {
    const activeTodo = makeTodo({ id: ACTIVE_ID, status: 'active' })
    const fetch = makeApiFetch([
      () => Promise.resolve(fakeResponse([activeTodo])),
      () => Promise.resolve({ ...activeTodo, status: 'completed' as const }),
    ])
    const { loadTodos, toggleTodo } = useTodos(fetch)
    await loadTodos()
    await toggleTodo(ACTIVE_ID)

    expect(fetch).toHaveBeenNthCalledWith(2, apiTodoPath(ACTIVE_ID), {
      method: 'PATCH',
      body: { status: 'completed' },
    })
  })

  it('active -> completed transition', async () => {
    const activeTodo = makeTodo({ id: ACTIVE_ID, status: 'active', title: 'Active' })
    const patchResponse = { ...activeTodo, status: 'completed' as const }
    const { todos, toggleTodo } = await setupToggle(ACTIVE_ID, patchResponse)
    await toggleTodo(ACTIVE_ID)
    const toggled = todos.value.find(t => t.id === ACTIVE_ID)!
    expect(toggled.status).toBe('completed')
  })

  it('completed -> active transition', async () => {
    const completedTodo = makeTodo({ id: COMPLETED_ID, status: 'completed', title: 'Done' })
    const patchResponse = { ...completedTodo, status: 'active' as const }
    const { todos, toggleTodo } = await setupToggle(COMPLETED_ID, patchResponse)
    await toggleTodo(COMPLETED_ID)
    const toggled = todos.value.find(t => t.id === COMPLETED_ID)!
    expect(toggled.status).toBe('active')
  })

  it('rolls back status on API error (500)', async () => {
    const activeTodo = makeTodo({ id: ACTIVE_ID, status: 'active' })
    const fetch = makeApiFetch([
      () => Promise.resolve(fakeResponse([activeTodo])),
      () => Promise.reject(new Error('Server error')),
    ])
    const { todos, loadTodos, toggleTodo } = useTodos(fetch)
    await loadTodos()

    await expect(toggleTodo(ACTIVE_ID)).rejects.toThrow('Server error')

    // Status must be rolled back to the original value
    expect(todos.value[0]!.status).toBe('active')
  })

  it('is a no-op for an unknown id', async () => {
    const todo = makeTodo({ id: ACTIVE_ID })
    const fetch = makeApiFetch([
      () => Promise.resolve(fakeResponse([todo])),
    ])
    const { todos, loadTodos, toggleTodo } = useTodos(fetch)
    await loadTodos()

    // Should resolve without throwing and make no API call
    await toggleTodo('unknown-id')
    expect(todos.value[0]!.status).toBe('active')
    expect(fetch).toHaveBeenCalledOnce() // only the initial loadTodos
  })
})

// ---------------------------------------------------------------------------
// deleteTodo — optimistic removal + rollback
// ---------------------------------------------------------------------------

describe('useTodos — deleteTodo()', () => {
  const ID_A = '00000000-0000-4000-8000-000000000001'
  const ID_B = '00000000-0000-4000-8000-000000000002'

  it('optimistically removes the todo before API responds', async () => {
    const todo = makeTodo({ id: ID_A })
    let resolveDelete!: () => void
    const deletePromise = new Promise<void>(r => { resolveDelete = r })

    const fetch = makeApiFetch([
      () => Promise.resolve(fakeResponse([todo])),
      () => deletePromise,
    ])
    const { todos, loadTodos, deleteTodo } = useTodos(fetch)
    await loadTodos()

    const deleteInFlight = deleteTodo(ID_A)
    expect(todos.value).toHaveLength(0)

    resolveDelete()
    await deleteInFlight
  })

  it('sends DELETE to the correct endpoint', async () => {
    const todo = makeTodo({ id: ID_A })
    const fetch = makeApiFetch([
      () => Promise.resolve(fakeResponse([todo])),
      () => Promise.resolve(undefined),
    ])
    const { loadTodos, deleteTodo } = useTodos(fetch)
    await loadTodos()
    await deleteTodo(ID_A)

    expect(fetch).toHaveBeenNthCalledWith(2, apiTodoPath(ID_A), { method: 'DELETE' })
  })

  it('removes the correct todo when multiple exist', async () => {
    const a = makeTodo({ id: ID_A, title: 'A' })
    const b = makeTodo({ id: ID_B, title: 'B' })
    const fetch = makeApiFetch([
      () => Promise.resolve(fakeResponse([a, b])),
      () => Promise.resolve(undefined),
    ])
    const { todos, loadTodos, deleteTodo } = useTodos(fetch)
    await loadTodos()
    await deleteTodo(ID_A)

    expect(todos.value).toHaveLength(1)
    expect(todos.value[0]!.id).toBe(ID_B)
  })

  it('rolls back removal on API error', async () => {
    const todo = makeTodo({ id: ID_A })
    const fetch = makeApiFetch([
      () => Promise.resolve(fakeResponse([todo])),
      () => Promise.reject(new Error('Network error')),
    ])
    const { todos, loadTodos, deleteTodo } = useTodos(fetch)
    await loadTodos()

    await expect(deleteTodo(ID_A)).rejects.toThrow('Network error')

    expect(todos.value).toHaveLength(1)
    expect(todos.value[0]!.id).toBe(ID_A)
  })

  it('clears editingTodoId if the deleted todo was being edited', async () => {
    const todo = makeTodo({ id: ID_A })
    const fetch = makeApiFetch([
      () => Promise.resolve(fakeResponse([todo])),
      () => Promise.resolve(undefined),
    ])
    const { editingTodoId, loadTodos, deleteTodo, startEditing } = useTodos(fetch)
    await loadTodos()
    startEditing(ID_A)
    expect(editingTodoId.value).toBe(ID_A)

    await deleteTodo(ID_A)
    expect(editingTodoId.value).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// updateTodoTitle
// ---------------------------------------------------------------------------

describe('useTodos — updateTodoTitle()', () => {
  const TODO_ID = '00000000-0000-4000-8000-000000000001'

  it('updates the title in todos[] on success', async () => {
    const todo = makeTodo({ id: TODO_ID, title: 'Old title' })
    const updated = { ...todo, title: 'New title', updatedAt: '2024-01-02T10:00:00.000Z' }
    const fetch = makeApiFetch([
      () => Promise.resolve(fakeResponse([todo])),
      () => Promise.resolve(updated),
    ])
    const { todos, loadTodos, updateTodoTitle } = useTodos(fetch)
    await loadTodos()
    await updateTodoTitle(TODO_ID, 'New title')

    expect(todos.value[0]!.title).toBe('New title')
  })

  it('sends PATCH to the correct endpoint with new title', async () => {
    const todo = makeTodo({ id: TODO_ID, title: 'Old' })
    const updated = { ...todo, title: 'New' }
    const fetch = makeApiFetch([
      () => Promise.resolve(fakeResponse([todo])),
      () => Promise.resolve(updated),
    ])
    const { loadTodos, updateTodoTitle } = useTodos(fetch)
    await loadTodos()
    await updateTodoTitle(TODO_ID, 'New')

    expect(fetch).toHaveBeenNthCalledWith(2, apiTodoPath(TODO_ID), {
      method: 'PATCH',
      body: { title: 'New' },
    })
  })

  it('clears editingTodoId on success', async () => {
    const todo = makeTodo({ id: TODO_ID, title: 'Old' })
    const updated = { ...todo, title: 'New' }
    const fetch = makeApiFetch([
      () => Promise.resolve(fakeResponse([todo])),
      () => Promise.resolve(updated),
    ])
    const { editingTodoId, loadTodos, updateTodoTitle, startEditing } = useTodos(fetch)
    await loadTodos()
    startEditing(TODO_ID)
    expect(editingTodoId.value).toBe(TODO_ID)

    await updateTodoTitle(TODO_ID, 'New')
    expect(editingTodoId.value).toBeNull()
  })

  it('propagates API errors (caller handles error display)', async () => {
    const todo = makeTodo({ id: TODO_ID, title: 'Old' })
    const fetch = makeApiFetch([
      () => Promise.resolve(fakeResponse([todo])),
      () => Promise.reject(new Error('Validation error')),
    ])
    const { loadTodos, updateTodoTitle } = useTodos(fetch)
    await loadTodos()

    await expect(updateTodoTitle(TODO_ID, '')).rejects.toThrow('Validation error')
  })
})

// ---------------------------------------------------------------------------
// startEditing / cancelEditing
// ---------------------------------------------------------------------------

describe('useTodos — editing state', () => {
  const TODO_ID = '00000000-0000-4000-8000-000000000001'

  it('startEditing sets editingTodoId', () => {
    const { editingTodoId, startEditing } = useTodos(makeSimpleFetch(fakeResponse([])))
    startEditing(TODO_ID)
    expect(editingTodoId.value).toBe(TODO_ID)
  })

  it('cancelEditing clears editingTodoId', () => {
    const { editingTodoId, startEditing, cancelEditing } = useTodos(
      makeSimpleFetch(fakeResponse([])),
    )
    startEditing(TODO_ID)
    cancelEditing()
    expect(editingTodoId.value).toBeNull()
  })

  it('startEditing on a different id replaces editingTodoId (only one edit at a time)', () => {
    const OTHER_ID = '00000000-0000-4000-8000-000000000002'
    const { editingTodoId, startEditing } = useTodos(makeSimpleFetch(fakeResponse([])))
    startEditing(TODO_ID)
    startEditing(OTHER_ID)
    expect(editingTodoId.value).toBe(OTHER_ID)
  })
})
