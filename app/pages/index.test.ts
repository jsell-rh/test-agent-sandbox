/**
 * pages/index.vue — component tests
 *
 * Tests the core page rendering contract from specs/interface.spec.md:
 *   - Page renders without errors on mount
 *   - Initial load calls GET /api/todos and populates the todo list
 *   - Todos are displayed in the ordered list
 *
 * Strategy:
 *   vi.mock() replaces useTodos with a fake that returns controlled state.
 *   This decouples the page rendering test from composable internals and
 *   from network calls. The composable behaviour is covered separately in
 *   useTodos.test.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, computed } from 'vue'
import type { TodoResource } from '../composables/useTodos'

// ---------------------------------------------------------------------------
// Fake useTodos
// ---------------------------------------------------------------------------

const mockLoadTodos = vi.fn()
let fakeTodos: TodoResource[] = []

vi.mock('../composables/useTodos', () => ({
  useTodos: () => {
    const todos = ref<TodoResource[]>(fakeTodos)
    const filter = ref<'all' | 'active' | 'completed'>('all')
    const editingTodoId = ref<string | null>(null)
    const filteredTodos = computed(() => todos.value)
    const counts = computed(() => ({
      all: todos.value.length,
      active: todos.value.filter((t: TodoResource) => t.status === 'active').length,
      completed: todos.value.filter((t: TodoResource) => t.status === 'completed').length,
    }))
    return { todos, filter, editingTodoId, filteredTodos, counts, loadTodos: mockLoadTodos }
  },
  FILTER_ALL: 'all',
  FILTER_ACTIVE: 'active',
  FILTER_COMPLETED: 'completed',
}))

// Import AFTER mock is declared
import IndexPage from './index.vue'

// ---------------------------------------------------------------------------
// Helpers
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

function mountPage() {
  return mount(IndexPage, {
    global: {
      stubs: {
        // Stub AppHeader to isolate the page component under test
        AppHeader: { template: '<header data-testid="app-header">todos</header>' },
      },
    },
  })
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  fakeTodos = []
})

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe('pages/index.vue — rendering', () => {
  it('renders without throwing an error', () => {
    expect(() => mountPage()).not.toThrow()
  })

  it('mounts and renders the AppHeader', () => {
    const wrapper = mountPage()
    expect(wrapper.find('[data-testid="app-header"]').exists()).toBe(true)
  })

  it('calls loadTodos on mount', async () => {
    mountPage()
    await flushPromises()
    expect(mockLoadTodos).toHaveBeenCalledOnce()
  })

  it('renders an ordered list for todo items', () => {
    const wrapper = mountPage()
    expect(wrapper.find('ol.todo-list').exists()).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Todo list population
// ---------------------------------------------------------------------------

describe('pages/index.vue — todo list', () => {
  it('renders one list item per todo', async () => {
    fakeTodos = [
      makeTodo({ id: '00000000-0000-4000-8000-000000000001', title: 'First' }),
      makeTodo({ id: '00000000-0000-4000-8000-000000000002', title: 'Second' }),
    ]

    const wrapper = mountPage()
    await flushPromises()

    const items = wrapper.findAll('li.todo-item')
    expect(items).toHaveLength(2)
  })

  it('displays todo titles in list items', async () => {
    fakeTodos = [makeTodo({ title: 'Buy groceries' })]

    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.find('li.todo-item').text()).toContain('Buy groceries')
  })

  it('applies "completed" class to completed todos', async () => {
    fakeTodos = [
      makeTodo({ id: '00000000-0000-4000-8000-000000000001', status: 'active' }),
      makeTodo({ id: '00000000-0000-4000-8000-000000000002', status: 'completed' }),
    ]

    const wrapper = mountPage()
    await flushPromises()

    const items = wrapper.findAll('li.todo-item')
    expect(items[0]!.classes()).not.toContain('completed')
    expect(items[1]!.classes()).toContain('completed')
  })

  it('renders an empty list when no todos exist', () => {
    fakeTodos = []
    const wrapper = mountPage()
    expect(wrapper.findAll('li.todo-item')).toHaveLength(0)
  })
})
