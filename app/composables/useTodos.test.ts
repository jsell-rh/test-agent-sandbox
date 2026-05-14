/**
 * useTodos composable — unit tests
 *
 * Tests the UI state machine defined in specs/interface.spec.md:
 *   - Initial state (todos[], filter, editingTodoId)
 *   - loadTodos() populates todos[] from the API response
 *   - filteredTodos computed follows the active FilterCriteria
 *   - counts computed reflects the full todos[], not the filtered view
 *
 * Strategy:
 *   A fake fetch function is injected via the optional parameter so tests
 *   exercise real behaviour without touching the network or Nuxt globals.
 */

import { describe, it, expect, vi } from 'vitest'
import {
  useTodos,
  FILTER_ALL,
  FILTER_ACTIVE,
  FILTER_COMPLETED,
  API_TODOS_PATH,
  API_TODOS_COMPLETED_PATH,
} from './useTodos'
import type { TodoResource, TodoListResponse, ClearCompletedResponse } from './useTodos'

// ---------------------------------------------------------------------------
// Fake helpers
// ---------------------------------------------------------------------------

function makeTodo(overrides: Partial<TodoResource> = {}): TodoResource {
  return {
    id: 'aaaaaaaa-0000-4000-8000-000000000001',
    title: 'Test todo',
    status: 'active',
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

/** Returns a fake fetch that resolves with the given response. */
function fakeFetch(response: TodoListResponse) {
  return vi.fn().mockResolvedValue(response)
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe('useTodos — initial state', () => {
  it('todos[] starts empty', () => {
    const { todos } = useTodos(fakeFetch(fakeResponse([])))
    expect(todos.value).toEqual([])
  })

  it('filter starts as "all"', () => {
    const { filter } = useTodos(fakeFetch(fakeResponse([])))
    expect(filter.value).toBe(FILTER_ALL)
  })

  it('editingTodoId starts as null', () => {
    const { editingTodoId } = useTodos(fakeFetch(fakeResponse([])))
    expect(editingTodoId.value).toBeNull()
  })

  it('filteredTodos starts empty', () => {
    const { filteredTodos } = useTodos(fakeFetch(fakeResponse([])))
    expect(filteredTodos.value).toEqual([])
  })

  it('counts start at zero', () => {
    const { counts } = useTodos(fakeFetch(fakeResponse([])))
    expect(counts.value).toEqual({ all: 0, active: 0, completed: 0 })
  })
})

// ---------------------------------------------------------------------------
// loadTodos
// ---------------------------------------------------------------------------

describe('useTodos — loadTodos()', () => {
  it('populates todos[] with the API response', async () => {
    const todo = makeTodo({ title: 'Buy milk' })
    const fetch = fakeFetch(fakeResponse([todo]))
    const { todos, loadTodos } = useTodos(fetch)

    await loadTodos()

    expect(todos.value).toHaveLength(1)
    expect(todos.value[0]).toMatchObject({ title: 'Buy milk', status: 'active' })
  })

  it('calls the API endpoint', async () => {
    const fetch = fakeFetch(fakeResponse([]))
    const { loadTodos } = useTodos(fetch)

    await loadTodos()

    expect(fetch).toHaveBeenCalledOnce()
    expect(fetch).toHaveBeenCalledWith(API_TODOS_PATH)
  })

  it('replaces existing todos[] on second call', async () => {
    const first = makeTodo({ id: '00000000-0000-4000-8000-000000000001', title: 'First' })
    const second = makeTodo({ id: '00000000-0000-4000-8000-000000000002', title: 'Second' })

    const fetch = vi.fn()
      .mockResolvedValueOnce(fakeResponse([first]))
      .mockResolvedValueOnce(fakeResponse([second]))

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
    const fetch = fakeFetch(fakeResponse([newer, older]))
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
    const fetch = fakeFetch(fakeResponse([active, completed]))
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
    const fetch = fakeFetch(
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
    const fetch = fakeFetch(fakeResponse([active, completed]))
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
// clearCompleted — bulk delete action
// ---------------------------------------------------------------------------

/** Fake delete function that resolves with the given response. */
function fakeDeleteFn(response: ClearCompletedResponse) {
  return vi.fn().mockResolvedValue(response)
}

describe('useTodos — clearCompleted()', () => {
  it('calls DELETE on API_TODOS_COMPLETED_PATH', async () => {
    const active = makeTodo({ id: '00000000-0000-4000-8000-000000000001', status: 'active' })
    const completed = makeTodo({ id: '00000000-0000-4000-8000-000000000002', status: 'completed' })
    const fetch = fakeFetch(fakeResponse([active, completed]))
    const deleteFn = fakeDeleteFn({ deletedCount: 1 })
    const { loadTodos, clearCompleted } = useTodos(fetch, deleteFn)
    await loadTodos()

    await clearCompleted()

    expect(deleteFn).toHaveBeenCalledOnce()
    expect(deleteFn).toHaveBeenCalledWith(API_TODOS_COMPLETED_PATH)
  })

  it('removes all completed todos from todos[]', async () => {
    const active = makeTodo({ id: '00000000-0000-4000-8000-000000000001', status: 'active' })
    const completed = makeTodo({ id: '00000000-0000-4000-8000-000000000002', status: 'completed' })
    const fetch = fakeFetch(fakeResponse([active, completed]))
    const deleteFn = fakeDeleteFn({ deletedCount: 1 })
    const { todos, loadTodos, clearCompleted } = useTodos(fetch, deleteFn)
    await loadTodos()

    expect(todos.value).toHaveLength(2)

    await clearCompleted()

    expect(todos.value).toHaveLength(1)
    expect(todos.value[0]!.status).toBe(FILTER_ACTIVE)
  })

  it('leaves active todos intact after clearCompleted', async () => {
    const active1 = makeTodo({ id: '00000000-0000-4000-8000-000000000001', title: 'Keep me', status: 'active' })
    const active2 = makeTodo({ id: '00000000-0000-4000-8000-000000000002', title: 'Keep me too', status: 'active' })
    const completed = makeTodo({ id: '00000000-0000-4000-8000-000000000003', status: 'completed' })
    const fetch = fakeFetch(fakeResponse([active1, active2, completed]))
    const deleteFn = fakeDeleteFn({ deletedCount: 1 })
    const { todos, loadTodos, clearCompleted } = useTodos(fetch, deleteFn)
    await loadTodos()

    await clearCompleted()

    expect(todos.value).toHaveLength(2)
    expect(todos.value.map(t => t.title)).toEqual(['Keep me', 'Keep me too'])
  })

  it('returns the deletedCount from the API response', async () => {
    const c1 = makeTodo({ id: '00000000-0000-4000-8000-000000000001', status: 'completed' })
    const c2 = makeTodo({ id: '00000000-0000-4000-8000-000000000002', status: 'completed' })
    const fetch = fakeFetch(fakeResponse([c1, c2]))
    const deleteFn = fakeDeleteFn({ deletedCount: 2 })
    const { loadTodos, clearCompleted } = useTodos(fetch, deleteFn)
    await loadTodos()

    const count = await clearCompleted()

    expect(count).toBe(2)
  })

  it('when no completed todos exist, todos[] is unchanged and deletedCount is 0', async () => {
    const active = makeTodo({ id: '00000000-0000-4000-8000-000000000001', status: 'active' })
    const fetch = fakeFetch(fakeResponse([active]))
    const deleteFn = fakeDeleteFn({ deletedCount: 0 })
    const { todos, loadTodos, clearCompleted } = useTodos(fetch, deleteFn)
    await loadTodos()

    const count = await clearCompleted()

    expect(todos.value).toHaveLength(1)
    expect(count).toBe(0)
  })
})
