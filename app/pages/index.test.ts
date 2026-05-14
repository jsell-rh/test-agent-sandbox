/**
 * pages/index.vue — component tests
 *
 * Tests the core page rendering contract from specs/interface.spec.md:
 *   - Page renders without errors on mount
 *   - Initial load calls GET /api/todos and populates the todo list
 *   - Todos are displayed in the ordered list
 *   - NewTodoInput is rendered and wired with createTodo
 *
 * Strategy:
 *   vi.mock() replaces useTodos with a controlled fake that:
 *     1. Exposes real Vue reactivity (ref/computed) so the template updates
 *        correctly when loadTodos() is called.
 *     2. Implements loadTodos() to actually populate todos[] — matching the
 *        production data-flow path (mount → loadTodos → todos updates → DOM).
 *     3. Exposes createTodo as a spy so tests can assert it is passed to
 *        NewTodoInput as a prop.
 *   `fakeTodos` is set before each mount to control what the "API" returns.
 *
 *   Composable behaviour (state transitions, filtering, counts, createTodo)
 *   is covered exhaustively in useTodos.test.ts and NewTodoInput.test.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, computed } from 'vue'
import {
  FILTER_ALL,
  FILTER_ACTIVE,
  FILTER_COMPLETED,
} from '../composables/useTodos'
import type { TodoResource, FilterCriteria } from '../composables/useTodos'

// ---------------------------------------------------------------------------
// Fake useTodos factory
// ---------------------------------------------------------------------------

// `fakeTodos` is set in beforeEach; each mount creates a fresh ref seeded from it.
let fakeTodos: TodoResource[] = []

vi.mock('../composables/useTodos', async (importOriginal) => {
  // Keep the real exported constants (FILTER_ALL, etc.) — only replace the composable.
  const original = await importOriginal<typeof import('../composables/useTodos')>()
  return {
    ...original,
    useTodos: () => {
      // Real Vue reactivity — starts empty.
      const todos = ref<TodoResource[]>([])
      const filter = ref<FilterCriteria>(FILTER_ALL)
      const editingTodoId = ref<string | null>(null)

      // filteredTodos mirrors production: client-side filter over todos[].
      const filteredTodos = computed<TodoResource[]>(() => {
        const f = filter.value
        if (f === FILTER_ALL) return todos.value
        return todos.value.filter(t => t.status === f)
      })

      const counts = computed(() => ({
        all: todos.value.length,
        active: todos.value.filter((t: TodoResource) => t.status === FILTER_ACTIVE).length,
        completed: todos.value.filter((t: TodoResource) => t.status === FILTER_COMPLETED).length,
      }))

      // loadTodos() actually populates todos[] — this is the key data-flow gate.
      // If onMounted never calls loadTodos(), todos stays empty and list tests fail.
      const loadTodos = vi.fn().mockImplementation(async () => {
        todos.value = [...fakeTodos]
      })

      // createTodo() prepends a new todo — spy so tests can assert prop wiring.
      const createTodo = vi.fn().mockResolvedValue(undefined)

      return { todos, filter, editingTodoId, filteredTodos, counts, loadTodos, createTodo }
    },
  }
})

// Import AFTER mock is declared.
import IndexPage from './index.vue'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TODO_LIST_SELECTOR = '[data-testid="todo-list"]'
const TODO_ITEM_SELECTOR = '[data-testid="todo-item"]'
const NEW_TODO_INPUT_STUB = '[data-testid="new-todo-input-stub"]'

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
        // Stub AppHeader to isolate the page component under test.
        AppHeader: { template: '<header data-testid="app-header">todos</header>' },
        // Stub NewTodoInput to isolate the page; NewTodoInput is tested separately.
        NewTodoInput: {
          name: 'NewTodoInput',
          template: '<input data-testid="new-todo-input-stub" />',
          props: ['createTodo'],
          emits: ['error'],
        },
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

  it('mounts and renders the AppHeader stub', () => {
    const wrapper = mountPage()
    expect(wrapper.find('[data-testid="app-header"]').exists()).toBe(true)
  })

  it('calls loadTodos on mount via onMounted', async () => {
    const wrapper = mountPage()
    await flushPromises()
    // Retrieve the loadTodos spy from the component's exposed composable state.
    // If onMounted is removed, this assertion will fail.
    const { loadTodos } = wrapper.getCurrentComponent().setupState as { loadTodos: ReturnType<typeof vi.fn> }
    expect(loadTodos).toHaveBeenCalledOnce()
  })

  it('renders a todo list container', () => {
    const wrapper = mountPage()
    expect(wrapper.find(TODO_LIST_SELECTOR).exists()).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Todo list population — exercises the mount → loadTodos → DOM data flow
// ---------------------------------------------------------------------------

describe('pages/index.vue — todo list', () => {
  it('renders one list item per todo returned by loadTodos', async () => {
    // fakeTodos controls what loadTodos() populates into todos[].
    fakeTodos = [
      makeTodo({ id: '00000000-0000-4000-8000-000000000001', title: 'First' }),
      makeTodo({ id: '00000000-0000-4000-8000-000000000002', title: 'Second' }),
    ]

    const wrapper = mountPage()
    await flushPromises() // onMounted → loadTodos() → todos[] updates → DOM re-renders

    const items = wrapper.findAll(TODO_ITEM_SELECTOR)
    expect(items).toHaveLength(2)
  })

  it('displays todo titles in list items', async () => {
    fakeTodos = [makeTodo({ title: 'Buy groceries' })]

    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.find(TODO_ITEM_SELECTOR).text()).toContain('Buy groceries')
  })

  it('applies "completed" CSS class to completed todos', async () => {
    fakeTodos = [
      makeTodo({ id: '00000000-0000-4000-8000-000000000001', status: FILTER_ACTIVE }),
      makeTodo({ id: '00000000-0000-4000-8000-000000000002', status: FILTER_COMPLETED }),
    ]

    const wrapper = mountPage()
    await flushPromises()

    const items = wrapper.findAll(TODO_ITEM_SELECTOR)
    expect(items[0]!.classes()).not.toContain(FILTER_COMPLETED)
    expect(items[1]!.classes()).toContain(FILTER_COMPLETED)
  })

  it('renders an empty list when loadTodos returns no todos', async () => {
    fakeTodos = [] // empty API response

    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.findAll(TODO_ITEM_SELECTOR)).toHaveLength(0)
  })

  it('does not show todos before loadTodos completes (initial state is empty)', () => {
    // Before flushPromises — onMounted has not yet resolved the loadTodos promise.
    const wrapper = mountPage()
    // Synchronously after mount, todos[] should still be empty.
    expect(wrapper.findAll(TODO_ITEM_SELECTOR)).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// NewTodoInput wiring — page passes createTodo to the component
// ---------------------------------------------------------------------------

describe('pages/index.vue — NewTodoInput wiring', () => {
  it('renders the NewTodoInput stub', () => {
    const wrapper = mountPage()
    expect(wrapper.find(NEW_TODO_INPUT_STUB).exists()).toBe(true)
  })

  it('passes the createTodo action from useTodos to NewTodoInput', async () => {
    const wrapper = mountPage()
    const newTodoStub = wrapper.findComponent({ name: 'NewTodoInput' })

    // Call the prop directly — if it's the correct createTodo from useTodos,
    // it will invoke the spy registered in the mock.
    const createTodoProp = newTodoStub.props('createTodo') as (title: string) => Promise<void>
    await createTodoProp('Test title')

    // Retrieve the spy from setupState to confirm it was invoked.
    const { createTodo } = wrapper.getCurrentComponent().setupState as {
      createTodo: ReturnType<typeof vi.fn>
    }
    expect(createTodo).toHaveBeenCalledOnce()
    expect(createTodo).toHaveBeenCalledWith('Test title')
  })

  it('handles the error event from NewTodoInput without crashing', async () => {
    const wrapper = mountPage()
    const newTodoStub = wrapper.findComponent({ name: 'NewTodoInput' })

    // Simulate NewTodoInput emitting an error event.
    await newTodoStub.vm.$emit('error', 'Something went wrong')
    await flushPromises()

    // The page must not crash; the error is stored for the display task.
    expect(wrapper.exists()).toBe(true)
  })
})
