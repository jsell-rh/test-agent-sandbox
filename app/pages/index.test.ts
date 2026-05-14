/**
 * pages/index.vue — component tests
 *
 * Tests the core page rendering contract from specs/interface.spec.md:
 *   - Page renders without errors on mount
 *   - Initial load calls GET /api/todos and populates the todo list
 *   - Todos are displayed in the ordered list
 *   - FooterBar is shown only when todos[] is non-empty
 *   - Filter tabs show/hide items without an additional network request
 *   - "{N} items left" reflects current active count after filter changes
 *   - Empty-state message is shown when filteredTodos is empty
 *   - Clicking "Clear completed" calls clearCompleted() and removes them from todos[]
 *
 * Strategy:
 *   vi.mock() replaces useTodos with a controlled fake that:
 *     1. Exposes real Vue reactivity (ref/computed) so the template updates
 *        correctly when loadTodos() is called.
 *     2. Implements loadTodos() to actually populate todos[] — matching the
 *        production data-flow path (mount → loadTodos → todos updates → DOM).
 *   `fakeTodos` is set before each mount to control what the "API" returns.
 *
 *   Composable behaviour (state transitions, filtering, counts) is covered
 *   exhaustively in useTodos.test.ts.
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

      // clearCompleted() removes completed todos from todos[] client-side.
      const clearCompleted = vi.fn().mockImplementation(async () => {
        const count = todos.value.filter(t => t.status === FILTER_COMPLETED).length
        todos.value = todos.value.filter(t => t.status !== FILTER_COMPLETED)
        return count
      })

      return { todos, filter, editingTodoId, filteredTodos, counts, loadTodos, clearCompleted }
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
const FOOTER_BAR_SELECTOR = '[data-testid="footer-bar"]'
const ITEMS_LEFT_SELECTOR = '[data-testid="items-left"]'
const FILTER_TAB_SELECTOR = '[data-testid="filter-tab"]'
const CLEAR_COMPLETED_SELECTOR = '[data-testid="clear-completed"]'
const EMPTY_STATE_SELECTOR = '[data-testid="empty-state"]'

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
// Footer bar — visibility (only when todos[] is non-empty)
// ---------------------------------------------------------------------------

describe('pages/index.vue — footer bar visibility', () => {
  it('footer bar is NOT visible when todos[] is empty', async () => {
    fakeTodos = []
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.find(FOOTER_BAR_SELECTOR).exists()).toBe(false)
  })

  it('footer bar IS visible when todos[] has at least one item', async () => {
    fakeTodos = [makeTodo({ title: 'One todo' })]
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.find(FOOTER_BAR_SELECTOR).exists()).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Filter tabs — client-side filter, no additional network request
// ---------------------------------------------------------------------------

describe('pages/index.vue — filter tabs (no extra network requests)', () => {
  it('clicking the Active tab hides completed todos without a network call', async () => {
    fakeTodos = [
      makeTodo({ id: '00000000-0000-4000-8000-000000000001', status: FILTER_ACTIVE }),
      makeTodo({ id: '00000000-0000-4000-8000-000000000002', status: FILTER_COMPLETED }),
    ]
    const wrapper = mountPage()
    await flushPromises()

    // Retrieve the loadTodos spy to assert no additional calls after filter change.
    const { loadTodos } = wrapper.getCurrentComponent().setupState as { loadTodos: ReturnType<typeof vi.fn> }
    expect(loadTodos).toHaveBeenCalledOnce() // only the initial load

    // Click the "Active" filter tab (index 1)
    const tabs = wrapper.findAll(FILTER_TAB_SELECTOR)
    await tabs[1]!.trigger('click')
    await flushPromises()

    // List now shows only the active todo
    expect(wrapper.findAll(TODO_ITEM_SELECTOR)).toHaveLength(1)

    // loadTodos was NOT called again — purely client-side filter
    expect(loadTodos).toHaveBeenCalledOnce()
  })

  it('clicking the Completed tab shows only completed todos without a network call', async () => {
    fakeTodos = [
      makeTodo({ id: '00000000-0000-4000-8000-000000000001', status: FILTER_ACTIVE }),
      makeTodo({ id: '00000000-0000-4000-8000-000000000002', status: FILTER_COMPLETED }),
    ]
    const wrapper = mountPage()
    await flushPromises()

    const { loadTodos } = wrapper.getCurrentComponent().setupState as { loadTodos: ReturnType<typeof vi.fn> }

    const tabs = wrapper.findAll(FILTER_TAB_SELECTOR)
    await tabs[2]!.trigger('click') // "Completed" tab
    await flushPromises()

    expect(wrapper.findAll(TODO_ITEM_SELECTOR)).toHaveLength(1)
    expect(loadTodos).toHaveBeenCalledOnce()
  })

  it('clicking All tab shows both active and completed', async () => {
    fakeTodos = [
      makeTodo({ id: '00000000-0000-4000-8000-000000000001', status: FILTER_ACTIVE }),
      makeTodo({ id: '00000000-0000-4000-8000-000000000002', status: FILTER_COMPLETED }),
    ]
    const wrapper = mountPage()
    await flushPromises()

    const tabs = wrapper.findAll(FILTER_TAB_SELECTOR)
    await tabs[1]!.trigger('click') // switch to Active
    await tabs[0]!.trigger('click') // switch back to All
    await flushPromises()

    expect(wrapper.findAll(TODO_ITEM_SELECTOR)).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// Items-left count — reactive to active count
// ---------------------------------------------------------------------------

describe('pages/index.vue — items-left count', () => {
  it('shows correct active count after load', async () => {
    fakeTodos = [
      makeTodo({ id: '00000000-0000-4000-8000-000000000001', status: FILTER_ACTIVE }),
      makeTodo({ id: '00000000-0000-4000-8000-000000000002', status: FILTER_ACTIVE }),
      makeTodo({ id: '00000000-0000-4000-8000-000000000003', status: FILTER_COMPLETED }),
    ]
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.find(ITEMS_LEFT_SELECTOR).text()).toContain('2 items left')
  })

  it('items-left count remains correct when filter changes (counts span all todos)', async () => {
    fakeTodos = [
      makeTodo({ id: '00000000-0000-4000-8000-000000000001', status: FILTER_ACTIVE }),
      makeTodo({ id: '00000000-0000-4000-8000-000000000002', status: FILTER_COMPLETED }),
    ]
    const wrapper = mountPage()
    await flushPromises()

    // Switch to Active filter — counts.active should still be 1
    const tabs = wrapper.findAll(FILTER_TAB_SELECTOR)
    await tabs[1]!.trigger('click')
    await flushPromises()

    expect(wrapper.find(ITEMS_LEFT_SELECTOR).text()).toContain('1 item left')
  })
})

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

describe('pages/index.vue — empty state', () => {
  it('shows empty-state message when todos[] is empty after load', async () => {
    fakeTodos = []
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.find(EMPTY_STATE_SELECTOR).exists()).toBe(true)
  })

  it('shows empty-state when all todos are filtered out', async () => {
    fakeTodos = [makeTodo({ status: FILTER_ACTIVE })]
    const wrapper = mountPage()
    await flushPromises()

    // Switch to Completed — no completed todos exist → empty state
    const tabs = wrapper.findAll(FILTER_TAB_SELECTOR)
    await tabs[2]!.trigger('click') // Completed
    await flushPromises()

    expect(wrapper.find(EMPTY_STATE_SELECTOR).exists()).toBe(true)
  })

  it('hides empty-state when filtered list has items', async () => {
    fakeTodos = [makeTodo({ status: FILTER_ACTIVE })]
    const wrapper = mountPage()
    await flushPromises()

    // Active filter — 1 todo visible → no empty state
    expect(wrapper.find(EMPTY_STATE_SELECTOR).exists()).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Clear completed — calls action and updates DOM
// ---------------------------------------------------------------------------

describe('pages/index.vue — clear completed', () => {
  it('clicking Clear completed calls clearCompleted()', async () => {
    fakeTodos = [
      makeTodo({ id: '00000000-0000-4000-8000-000000000001', status: FILTER_ACTIVE }),
      makeTodo({ id: '00000000-0000-4000-8000-000000000002', status: FILTER_COMPLETED }),
    ]
    const wrapper = mountPage()
    await flushPromises()

    const { clearCompleted } = wrapper.getCurrentComponent().setupState as { clearCompleted: ReturnType<typeof vi.fn> }

    await wrapper.find(CLEAR_COMPLETED_SELECTOR).trigger('click')
    await flushPromises()

    expect(clearCompleted).toHaveBeenCalledOnce()
  })

  it('Clear completed removes completed todos from the rendered list', async () => {
    fakeTodos = [
      makeTodo({ id: '00000000-0000-4000-8000-000000000001', status: FILTER_ACTIVE }),
      makeTodo({ id: '00000000-0000-4000-8000-000000000002', status: FILTER_COMPLETED }),
    ]
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.findAll(TODO_ITEM_SELECTOR)).toHaveLength(2)

    await wrapper.find(CLEAR_COMPLETED_SELECTOR).trigger('click')
    await flushPromises()

    expect(wrapper.findAll(TODO_ITEM_SELECTOR)).toHaveLength(1)
  })

  it('Clear completed button disappears after all completed are removed', async () => {
    fakeTodos = [
      makeTodo({ id: '00000000-0000-4000-8000-000000000001', status: FILTER_COMPLETED }),
    ]
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.find(CLEAR_COMPLETED_SELECTOR).exists()).toBe(true)

    await wrapper.find(CLEAR_COMPLETED_SELECTOR).trigger('click')
    await flushPromises()

    expect(wrapper.find(CLEAR_COMPLETED_SELECTOR).exists()).toBe(false)
  })
})
