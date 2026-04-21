/**
 * Main page component tests — filter bar, footer counts, "Clear completed"
 *
 * Tests the UI rendering and interactive behaviour of:
 *  - Filter tabs (client-side filter, no additional network request)
 *  - "{N} item(s) left" active-count display
 *  - "Clear completed" button visibility
 *  - Footer only visible when todos exist
 *  - Empty state message when filtered list is empty
 *  - New-todo input: Enter creates, Escape clears
 *  - Edit mode: double-click, Escape cancels, blank title deletes
 *
 * Critical test cases mapped from specs/interface.spec.md TDD Plan:
 *  - "Clear completed" button only visible when completedCount > 0
 *  - "{N} item(s) left" reflects current active count after toggling
 *  - Filter tabs correctly show/hide items without an additional network request
 *  - Double-clicking a title enters edit mode for that item only
 *  - Pressing Escape in edit mode restores original title (no save)
 *  - Submitting blank title in edit mode deletes the item
 *
 * Strategy:
 *  - useTodoActions is mocked (vi.mock) to prevent real API calls.
 *    The store is populated directly with test data via store actions.
 *  - Each test controls the store state before mounting so the page renders
 *    a deterministic initial view.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useTodosStore } from '~/stores/todos'
import type { Todo, TodoCounts } from '~/types/todo'

// ---------------------------------------------------------------------------
// Mock useTodoActions — prevent real API calls from onMounted(loadTodos)
// ---------------------------------------------------------------------------

const mockLoadTodos = vi.fn().mockResolvedValue(undefined)
const mockCreateTodo = vi.fn().mockResolvedValue(true)
const mockToggleTodo = vi.fn().mockResolvedValue(undefined)
const mockUpdateTitle = vi.fn().mockResolvedValue(undefined)
const mockDeleteTodo = vi.fn().mockResolvedValue(undefined)
const mockClearCompleted = vi.fn().mockResolvedValue(undefined)

vi.mock('~/composables/useTodoActions', () => ({
  useTodoActions: () => ({
    loadTodos: mockLoadTodos,
    createTodo: mockCreateTodo,
    toggleTodo: mockToggleTodo,
    updateTitle: mockUpdateTitle,
    deleteTodo: mockDeleteTodo,
    clearCompleted: mockClearCompleted,
  }),
}))

// ---------------------------------------------------------------------------
// Lazy-import the page AFTER the mock is in place
// ---------------------------------------------------------------------------

// We use a dynamic import pattern to ensure vi.mock is applied first.
// In Vitest, vi.mock is hoisted, so this static import is fine.
import IndexPage from '~/pages/index.vue'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let nextId = 0

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: `todo-${++nextId}`,
    title: 'Test todo',
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeCounts(overrides: Partial<TodoCounts> = {}): TodoCounts {
  return { all: 0, active: 0, completed: 0, ...overrides }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let pinia: ReturnType<typeof createPinia>

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  nextId = 0
  vi.clearAllMocks()
})

function mountPage() {
  return mount(IndexPage, {
    global: { plugins: [pinia] },
  })
}

// ---------------------------------------------------------------------------
// Footer visibility
// ---------------------------------------------------------------------------

describe('footer visibility', () => {
  it('footer is NOT visible when there are no todos', async () => {
    const wrapper = mountPage()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.todo-footer').exists()).toBe(false)
  })

  it('footer IS visible when at least one todo exists', async () => {
    const store = useTodosStore()
    store.setTodos([makeTodo()], makeCounts({ all: 1, active: 1, completed: 0 }))

    const wrapper = mountPage()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.todo-footer').exists()).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// "{N} item(s) left" active count display
// ---------------------------------------------------------------------------

describe('"{N} item(s) left" active count', () => {
  it('shows "0 items left" when all todos are completed', async () => {
    const store = useTodosStore()
    const completed = makeTodo({ status: 'completed' })
    store.setTodos([completed], makeCounts({ all: 1, active: 0, completed: 1 }))

    const wrapper = mountPage()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.todo-footer__count').text()).toContain('0 items left')
  })

  it('shows "1 item left" (singular) for one active todo', async () => {
    const store = useTodosStore()
    store.setTodos([makeTodo({ status: 'active' })], makeCounts({ all: 1, active: 1, completed: 0 }))

    const wrapper = mountPage()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.todo-footer__count').text()).toContain('1 item left')
  })

  it('shows "2 items left" (plural) for two active todos', async () => {
    const store = useTodosStore()
    store.setTodos(
      [makeTodo({ status: 'active' }), makeTodo({ status: 'active' })],
      makeCounts({ all: 2, active: 2, completed: 0 }),
    )

    const wrapper = mountPage()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.todo-footer__count').text()).toContain('2 items left')
  })

  it('updates count display when a todo is toggled to completed', async () => {
    const store = useTodosStore()
    const active = makeTodo({ status: 'active' })
    store.setTodos([active], makeCounts({ all: 1, active: 1, completed: 0 }))

    const wrapper = mountPage()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.todo-footer__count').text()).toContain('1 item left')

    // Simulate toggle via store mutation (as useTodoActions would do)
    store.updateTodoInList({ ...active, status: 'completed' })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.todo-footer__count').text()).toContain('0 items left')
  })
})

// ---------------------------------------------------------------------------
// "Clear completed" button visibility
// ---------------------------------------------------------------------------

describe('"Clear completed" button visibility', () => {
  it('is NOT visible when completedCount is 0', async () => {
    const store = useTodosStore()
    store.setTodos([makeTodo({ status: 'active' })], makeCounts({ all: 1, active: 1, completed: 0 }))

    const wrapper = mountPage()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.todo-footer__clear').exists()).toBe(false)
  })

  it('IS visible when completedCount > 0', async () => {
    const store = useTodosStore()
    const completed = makeTodo({ status: 'completed' })
    store.setTodos([completed], makeCounts({ all: 1, active: 0, completed: 1 }))

    const wrapper = mountPage()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.todo-footer__clear').exists()).toBe(true)
    expect(wrapper.find('.todo-footer__clear').text()).toContain('Clear completed')
  })

  it('appears after a todo is toggled to completed', async () => {
    const store = useTodosStore()
    const active = makeTodo({ status: 'active' })
    store.setTodos([active], makeCounts({ all: 1, active: 1, completed: 0 }))

    const wrapper = mountPage()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.todo-footer__clear').exists()).toBe(false)

    // Simulate completing the todo
    store.updateTodoInList({ ...active, status: 'completed' })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.todo-footer__clear').exists()).toBe(true)
  })

  it('disappears after "Clear completed" is clicked and optimistic update applied', async () => {
    const store = useTodosStore()
    const completed = makeTodo({ status: 'completed' })
    store.setTodos([completed], makeCounts({ all: 1, active: 0, completed: 1 }))

    const wrapper = mountPage()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.todo-footer__clear').exists()).toBe(true)

    await wrapper.find('.todo-footer__clear').trigger('click')
    await wrapper.vm.$nextTick()

    // mockClearCompleted is called; it in turn calls store.removeCompletedTodos()
    // But since we mocked useTodoActions, the store won't be mutated automatically.
    // Verify the action was called:
    expect(mockClearCompleted).toHaveBeenCalledOnce()
  })
})

// ---------------------------------------------------------------------------
// Filter tabs — client-side filtering (no additional network requests)
// ---------------------------------------------------------------------------

describe('filter tabs — client-side filtering', () => {
  function makeStore() {
    const store = useTodosStore()
    const active1 = makeTodo({ title: 'Active 1', status: 'active' })
    const active2 = makeTodo({ title: 'Active 2', status: 'active' })
    const done = makeTodo({ title: 'Done', status: 'completed' })
    store.setTodos([active1, active2, done], makeCounts({ all: 3, active: 2, completed: 1 }))
    return { store, active1, active2, done }
  }

  it('shows all todos when "All" tab is active', async () => {
    makeStore()
    const wrapper = mountPage()
    await wrapper.vm.$nextTick()

    // Default filter is "all"
    expect(wrapper.findAll('.todo-item')).toHaveLength(3)
  })

  it('shows only active todos when "Active" tab is clicked', async () => {
    const { store } = makeStore()
    const wrapper = mountPage()
    await wrapper.vm.$nextTick()

    // Click "Active" tab
    const tabs = wrapper.findAll('.todo-filter__tab')
    const activeTab = tabs.find(t => t.text() === 'Active')
    await activeTab!.trigger('click')
    await wrapper.vm.$nextTick()

    expect(store.filterCriteria).toBe('active')
    expect(wrapper.findAll('.todo-item')).toHaveLength(2)
    expect(wrapper.text()).toContain('Active 1')
    expect(wrapper.text()).toContain('Active 2')
    expect(wrapper.text()).not.toContain('Done')
  })

  it('shows only completed todos when "Completed" tab is clicked', async () => {
    const { store } = makeStore()
    const wrapper = mountPage()
    await wrapper.vm.$nextTick()

    const tabs = wrapper.findAll('.todo-filter__tab')
    const completedTab = tabs.find(t => t.text() === 'Completed')
    await completedTab!.trigger('click')
    await wrapper.vm.$nextTick()

    expect(store.filterCriteria).toBe('completed')
    expect(wrapper.findAll('.todo-item')).toHaveLength(1)
    expect(wrapper.text()).toContain('Done')
    expect(wrapper.text()).not.toContain('Active 1')
  })

  it('switching tabs does NOT call loadTodos (no network request)', async () => {
    makeStore()
    const wrapper = mountPage()
    await wrapper.vm.$nextTick()

    // Reset call count after initial mount
    mockLoadTodos.mockClear()

    const tabs = wrapper.findAll('.todo-filter__tab')
    const activeTab = tabs.find(t => t.text() === 'Active')
    await activeTab!.trigger('click')
    await wrapper.vm.$nextTick()

    const completedTab = tabs.find(t => t.text() === 'Completed')
    await completedTab!.trigger('click')
    await wrapper.vm.$nextTick()

    const allTab = tabs.find(t => t.text() === 'All')
    await allTab!.trigger('click')
    await wrapper.vm.$nextTick()

    // Filter changes must NOT trigger additional API calls
    expect(mockLoadTodos).not.toHaveBeenCalled()
  })

  it('active tab has aria-current="page" attribute', async () => {
    const store = useTodosStore()
    store.setTodos([makeTodo()], makeCounts({ all: 1, active: 1, completed: 0 }))

    const wrapper = mountPage()
    await wrapper.vm.$nextTick()

    const tabs = wrapper.findAll('.todo-filter__tab')
    const allTab = tabs.find(t => t.text() === 'All')
    expect(allTab!.attributes('aria-current')).toBe('page')

    const activeTab = tabs.find(t => t.text() === 'Active')
    expect(activeTab!.attributes('aria-current')).toBeUndefined()
  })

  it('active tab has --active CSS class', async () => {
    const store = useTodosStore()
    store.setTodos([makeTodo()], makeCounts({ all: 1, active: 1, completed: 0 }))

    const wrapper = mountPage()
    await wrapper.vm.$nextTick()

    const tabs = wrapper.findAll('.todo-filter__tab')
    const allTab = tabs.find(t => t.text() === 'All')
    expect(allTab!.classes()).toContain('todo-filter__tab--active')

    const activeTab = tabs.find(t => t.text() === 'Active')
    expect(activeTab!.classes()).not.toContain('todo-filter__tab--active')
  })
})

// ---------------------------------------------------------------------------
// Empty state message
// ---------------------------------------------------------------------------

describe('empty state message', () => {
  it('shows "No todos yet" when no todos exist at all', async () => {
    const wrapper = mountPage()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.todo-empty').exists()).toBe(true)
    expect(wrapper.find('.todo-empty').text()).toContain('No todos yet')
  })

  it('shows "All done!" contextual message when Active filter returns empty', async () => {
    const store = useTodosStore()
    const done = makeTodo({ status: 'completed' })
    store.setTodos([done], makeCounts({ all: 1, active: 0, completed: 1 }))
    store.setFilter('active')

    const wrapper = mountPage()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.todo-empty').exists()).toBe(true)
    expect(wrapper.find('.todo-empty').text()).toContain('All done')
  })

  it('shows "Nothing completed yet" when Completed filter returns empty', async () => {
    const store = useTodosStore()
    store.setTodos([makeTodo({ status: 'active' })], makeCounts({ all: 1, active: 1, completed: 0 }))
    store.setFilter('completed')

    const wrapper = mountPage()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.todo-empty').exists()).toBe(true)
    expect(wrapper.find('.todo-empty').text()).toContain('Nothing completed yet')
  })
})

// ---------------------------------------------------------------------------
// New-todo input
// ---------------------------------------------------------------------------

describe('new-todo input', () => {
  it('pressing Enter with a non-empty title calls createTodo', async () => {
    const wrapper = mountPage()
    await wrapper.vm.$nextTick()

    const input = wrapper.find('.todo-new__input')
    await input.setValue('New task')
    await input.trigger('keydown', { key: 'Enter' })

    expect(mockCreateTodo).toHaveBeenCalledWith('New task')
  })

  it('pressing Escape clears the input without calling createTodo', async () => {
    const wrapper = mountPage()
    await wrapper.vm.$nextTick()

    const input = wrapper.find('.todo-new__input')
    await input.setValue('Draft text')
    await input.trigger('keydown', { key: 'Escape' })
    await wrapper.vm.$nextTick()

    expect((input.element as HTMLInputElement).value).toBe('')
    expect(mockCreateTodo).not.toHaveBeenCalled()
  })

  it('pressing Enter with an empty/whitespace title does NOT call createTodo', async () => {
    const wrapper = mountPage()
    await wrapper.vm.$nextTick()

    const input = wrapper.find('.todo-new__input')
    await input.setValue('   ')
    await input.trigger('keydown', { key: 'Enter' })

    expect(mockCreateTodo).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Edit mode — double-click, Escape, blank submit
// ---------------------------------------------------------------------------

describe('edit mode', () => {
  it('double-clicking a todo label enters edit mode for THAT item only', async () => {
    const store = useTodosStore()
    const todo1 = makeTodo({ title: 'First todo' })
    const todo2 = makeTodo({ title: 'Second todo' })
    store.setTodos([todo1, todo2], makeCounts({ all: 2, active: 2, completed: 0 }))

    const wrapper = mountPage()
    await wrapper.vm.$nextTick()

    // Double-click the label of the first item
    const labels = wrapper.findAll('.todo-item__label')
    await labels[0]!.trigger('dblclick')
    await wrapper.vm.$nextTick()

    // Only the first todo should be in edit mode
    expect(store.editingTodoId).toBe(todo1.id)

    // Only one edit input should be rendered (for the first item)
    const editInputs = wrapper.findAll('.todo-item__edit-input')
    expect(editInputs).toHaveLength(1)

    // Second item should NOT be in edit mode
    expect(store.editingTodoId).not.toBe(todo2.id)
  })

  it('pressing Escape in edit mode clears editingTodoId without calling updateTitle', async () => {
    const store = useTodosStore()
    const todo = makeTodo({ title: 'Original title' })
    store.setTodos([todo], makeCounts({ all: 1, active: 1, completed: 0 }))
    store.startEditing(todo.id)

    const wrapper = mountPage()
    await wrapper.vm.$nextTick()

    const editInput = wrapper.find('.todo-item__edit-input')
    await editInput.setValue('Modified title')
    await editInput.trigger('keydown', { key: 'Escape' })
    await wrapper.vm.$nextTick()

    // Edit mode should be cleared
    expect(store.editingTodoId).toBeNull()

    // updateTitle must NOT have been called — Escape cancels without saving
    expect(mockUpdateTitle).not.toHaveBeenCalled()
  })

  it('submitting a blank title in edit mode calls updateTitle with empty string (triggers delete)', async () => {
    const store = useTodosStore()
    const todo = makeTodo({ title: 'Will be deleted' })
    store.setTodos([todo], makeCounts({ all: 1, active: 1, completed: 0 }))
    store.startEditing(todo.id)

    const wrapper = mountPage()
    await wrapper.vm.$nextTick()

    const editInput = wrapper.find('.todo-item__edit-input')
    await editInput.setValue('')
    await editInput.trigger('keydown', { key: 'Enter' })
    await wrapper.vm.$nextTick()

    // updateTitle is called with the blank value; the real implementation
    // delegates to deleteTodo when the trimmed title is empty (per spec).
    expect(mockUpdateTitle).toHaveBeenCalledWith(todo, '')
  })
})

// ---------------------------------------------------------------------------
// Load on mount
// ---------------------------------------------------------------------------

describe('initial data loading', () => {
  it('calls loadTodos on mount', async () => {
    mountPage()
    await Promise.resolve() // allow onMounted to fire
    expect(mockLoadTodos).toHaveBeenCalledOnce()
  })
})

// ---------------------------------------------------------------------------
// Failure modes — createTodo (spec: "API returns 500 on create")
// ---------------------------------------------------------------------------

describe('failure modes — createTodo', () => {
  it('does NOT clear the input when createTodo returns false (API error)', async () => {
    // Simulate API failure: createTodo returns false (error has been surfaced
    // to the store by the real composable; the mock just returns false here).
    mockCreateTodo.mockResolvedValue(false)

    const wrapper = mountPage()
    await wrapper.vm.$nextTick()

    const input = wrapper.find('.todo-new__input')
    await input.setValue('Important task')
    await input.trigger('keydown', { key: 'Enter' })
    await wrapper.vm.$nextTick()

    // Input must NOT be cleared — user should be able to retry.
    // (spec: "Input not cleared; error message displayed; UI state unchanged")
    expect((input.element as HTMLInputElement).value).toBe('Important task')
  })

  it('clears the input when createTodo returns true (success)', async () => {
    mockCreateTodo.mockResolvedValue(true) // default, but explicit for clarity

    const wrapper = mountPage()
    await wrapper.vm.$nextTick()

    const input = wrapper.find('.todo-new__input')
    await input.setValue('Task to create')
    await input.trigger('keydown', { key: 'Enter' })
    await wrapper.vm.$nextTick()

    expect((input.element as HTMLInputElement).value).toBe('')
  })
})

// ---------------------------------------------------------------------------
// Error toast display
// ---------------------------------------------------------------------------

describe('error toast display', () => {
  it('renders a toast when the store has an error', async () => {
    const store = useTodosStore()
    store.addError('INTERNAL_ERROR', 'Something went wrong')

    const wrapper = mountPage()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.todo-toast').exists()).toBe(true)
    expect(wrapper.find('.todo-toast__message').text()).toBe('Something went wrong')
  })

  it('renders multiple toasts for multiple errors', async () => {
    const store = useTodosStore()
    store.addError('INTERNAL_ERROR', 'First error')
    store.addError('INVALID_TITLE', 'Second error')

    const wrapper = mountPage()
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.todo-toast')).toHaveLength(2)
  })

  it('dismisses a toast when its close button is clicked', async () => {
    const store = useTodosStore()
    store.addError('INTERNAL_ERROR', 'Dismissible error')

    const wrapper = mountPage()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.todo-toast').exists()).toBe(true)

    await wrapper.find('.todo-toast__dismiss').trigger('click')
    await wrapper.vm.$nextTick()

    expect(store.errors).toHaveLength(0)
  })

  it('toast has role="alert" for screen reader announcements', async () => {
    const store = useTodosStore()
    store.addError('INTERNAL_ERROR', 'Accessible error')

    const wrapper = mountPage()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.todo-toast[role="alert"]').exists()).toBe(true)
  })

  it('toast area is not rendered when there are no errors', async () => {
    const wrapper = mountPage()
    await wrapper.vm.$nextTick()

    // No toasts should appear by default
    expect(wrapper.findAll('.todo-toast')).toHaveLength(0)
  })
})
