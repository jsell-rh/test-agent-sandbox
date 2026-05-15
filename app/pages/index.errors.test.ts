/**
 * pages/index.vue — error display integration tests
 *
 * Tests the error handling and display behaviour specified in
 * specs/interface.spec.md § "Non-Functional Requirements":
 *
 *   - API errors surfaced as non-blocking inline messages
 *   - Error messages auto-dismiss after 5 seconds
 *   - Previously loaded list remains visible when network fails
 *   - Error from NewTodoInput is shown to the user
 *   - Error from toggle (optimistic rollback) is shown to the user
 *   - Error from delete is shown to the user
 *   - Error message does not block interaction with the rest of the UI
 *
 * Strategy:
 *   - vi.mock() for useTodos gives full control over which actions resolve/reject.
 *   - vi.useFakeTimers() controls the 5-second auto-dismiss without real delays.
 *   - The real useErrorNotification composable runs (it has no side-effects
 *     beyond setTimeout, which is controlled by fake timers).
 *   - The real ErrorNotification component renders in the test DOM.
 *
 * This file has its own vi.mock() for useTodos so it does not interfere with
 * the existing index.test.ts mock scope.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, computed } from 'vue'
import {
  FILTER_ALL,
  FILTER_ACTIVE,
  FILTER_COMPLETED,
} from '../composables/useTodos'
import type { TodoResource, FilterCriteria } from '../composables/useTodos'

// ---------------------------------------------------------------------------
// Shared fake state — mutated in beforeEach
// ---------------------------------------------------------------------------

let fakeTodos: TodoResource[] = []
let toggleShouldFail = false
let deleteShouldFail = false
let updateTitleShouldFail = false
let clearCompletedShouldFail = false

vi.mock('../composables/useTodos', async (importOriginal) => {
  const original = await importOriginal<typeof import('../composables/useTodos')>()
  return {
    ...original,
    useTodos: () => {
      const todos = ref<TodoResource[]>([])
      const filter = ref<FilterCriteria>(FILTER_ALL)
      const editingTodoId = ref<string | null>(null)

      const filteredTodos = computed<TodoResource[]>(() => {
        const f = filter.value
        if (f === FILTER_ALL) return todos.value
        return todos.value.filter((t: TodoResource) => t.status === f)
      })

      const counts = computed(() => ({
        all: todos.value.length,
        active: todos.value.filter((t: TodoResource) => t.status === FILTER_ACTIVE).length,
        completed: todos.value.filter((t: TodoResource) => t.status === FILTER_COMPLETED).length,
      }))

      const loadTodos = vi.fn().mockImplementation(async () => {
        todos.value = [...fakeTodos]
      })

      const createTodo = vi.fn().mockResolvedValue(undefined)

      const clearCompleted = vi.fn().mockImplementation(async () => {
        if (clearCompletedShouldFail) {
          throw new Error('Network error on clear')
        }
        const count = todos.value.filter((t: TodoResource) => t.status === FILTER_COMPLETED).length
        todos.value = todos.value.filter((t: TodoResource) => t.status !== FILTER_COMPLETED)
        return count
      })

      /**
       * toggleTodo: optimistic flip + rollback on error.
       * Mirrors the real composable behaviour so rollback tests are meaningful.
       */
      const toggleTodo = vi.fn().mockImplementation(async (id: string) => {
        const idx = todos.value.findIndex((t: TodoResource) => t.id === id)
        if (idx === -1) return

        const todo = todos.value[idx]!
        const previousStatus = todo.status
        const nextStatus: TodoResource['status'] = previousStatus === FILTER_ACTIVE
          ? FILTER_COMPLETED
          : FILTER_ACTIVE

        // Optimistic flip
        todos.value[idx] = { ...todo, status: nextStatus }

        if (toggleShouldFail) {
          // Rollback
          todos.value[idx] = { ...todo, status: previousStatus }
          throw new Error('Network error on toggle')
        }
        // Confirm
        todos.value[idx] = { ...todo, status: nextStatus }
      })

      const deleteTodo = vi.fn().mockImplementation(async (id: string) => {
        const previousTodos = [...todos.value]
        // Optimistic removal
        todos.value = todos.value.filter((t: TodoResource) => t.id !== id)

        if (deleteShouldFail) {
          // Rollback
          todos.value = previousTodos
          throw new Error('Network error on delete')
        }
        if (editingTodoId.value === id) {
          editingTodoId.value = null
        }
      })

      const updateTodoTitle = vi.fn().mockImplementation(async (id: string, newTitle: string) => {
        if (updateTitleShouldFail) {
          throw new Error('Network error on update title')
        }
        const idx = todos.value.findIndex((t: TodoResource) => t.id === id)
        if (idx !== -1) {
          todos.value[idx] = { ...todos.value[idx]!, title: newTitle }
        }
        editingTodoId.value = null
      })

      const startEditing = vi.fn().mockImplementation((id: string) => {
        editingTodoId.value = id
      })

      const cancelEditing = vi.fn().mockImplementation(() => {
        editingTodoId.value = null
      })

      return {
        todos,
        filter,
        editingTodoId,
        filteredTodos,
        counts,
        loadTodos,
        createTodo,
        clearCompleted,
        toggleTodo,
        deleteTodo,
        updateTodoTitle,
        startEditing,
        cancelEditing,
      }
    },
  }
})

// Import AFTER mock declaration
import IndexPage from './index.vue'

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

const TODO_ITEM_SELECTOR = '[data-testid="todo-item"]'
const TODO_CHECKBOX_SELECTOR = '[data-testid="todo-checkbox"]'
const TODO_DELETE_SELECTOR = '[data-testid="todo-delete"]'
const NEW_TODO_INPUT_STUB = '[data-testid="new-todo-input-stub"]'
const ERROR_NOTIFICATION_SELECTOR = '[data-testid="error-notification"]'
const ERROR_MESSAGE_SELECTOR = '[data-testid="error-message"]'
const ERROR_DISMISS_SELECTOR = '[data-testid="error-dismiss"]'

// ---------------------------------------------------------------------------
// Helpers
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

function mountPage() {
  return mount(IndexPage, {
    global: {
      stubs: {
        AppHeader: { template: '<header data-testid="app-header">todos</header>' },
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
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  fakeTodos = []
  toggleShouldFail = false
  deleteShouldFail = false
  updateTitleShouldFail = false
  clearCompletedShouldFail = false
})

afterEach(() => {
  vi.useRealTimers()
})

// ---------------------------------------------------------------------------
// Error notification — NewTodoInput error
// ---------------------------------------------------------------------------

describe('pages/index.vue — error from NewTodoInput', () => {
  it('shows ErrorNotification when NewTodoInput emits error', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const stub = wrapper.findComponent({ name: 'NewTodoInput' })
    await stub.vm.$emit('error', 'Failed to create todo')
    await flushPromises()

    expect(wrapper.find(ERROR_NOTIFICATION_SELECTOR).exists()).toBe(true)
    expect(wrapper.find(ERROR_MESSAGE_SELECTOR).text()).toContain('Failed to create todo')
  })

  it('error message auto-dismisses after 5 seconds', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const stub = wrapper.findComponent({ name: 'NewTodoInput' })
    await stub.vm.$emit('error', 'Failed to create todo')
    await flushPromises()

    expect(wrapper.find(ERROR_NOTIFICATION_SELECTOR).exists()).toBe(true)

    // Advance fake timers by 5000ms (ERROR_DISMISS_MS)
    await vi.advanceTimersByTimeAsync(5000)
    await flushPromises()

    expect(wrapper.find(ERROR_NOTIFICATION_SELECTOR).exists()).toBe(false)
  })

  it('error does not disappear before 5 seconds have elapsed', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const stub = wrapper.findComponent({ name: 'NewTodoInput' })
    await stub.vm.$emit('error', 'Persistent error')
    await flushPromises()

    await vi.advanceTimersByTimeAsync(4999)
    await flushPromises()

    expect(wrapper.find(ERROR_NOTIFICATION_SELECTOR).exists()).toBe(true)
  })

  it('error notification does not block the todo list', async () => {
    fakeTodos = [makeTodo({ title: 'My todo' })]
    const wrapper = mountPage()
    await flushPromises()

    const stub = wrapper.findComponent({ name: 'NewTodoInput' })
    await stub.vm.$emit('error', 'Some error')
    await flushPromises()

    // Both error AND todo list must be visible simultaneously
    expect(wrapper.find(ERROR_NOTIFICATION_SELECTOR).exists()).toBe(true)
    expect(wrapper.findAll(TODO_ITEM_SELECTOR)).toHaveLength(1)
  })

  it('clicking dismiss clears the error message immediately', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const stub = wrapper.findComponent({ name: 'NewTodoInput' })
    await stub.vm.$emit('error', 'Dismissable error')
    await flushPromises()

    expect(wrapper.find(ERROR_NOTIFICATION_SELECTOR).exists()).toBe(true)

    await wrapper.find(ERROR_DISMISS_SELECTOR).trigger('click')
    await flushPromises()

    expect(wrapper.find(ERROR_NOTIFICATION_SELECTOR).exists()).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Previously loaded list stays visible on network failure
// ---------------------------------------------------------------------------

describe('pages/index.vue — previously loaded list visible on network failure', () => {
  it('todo list remains visible when toggle fails (optimistic rollback)', async () => {
    fakeTodos = [
      makeTodo({ id: '00000000-0000-4000-8000-000000000001', title: 'Important task' }),
    ]
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.findAll(TODO_ITEM_SELECTOR)).toHaveLength(1)

    // Trigger a toggle that will fail
    toggleShouldFail = true
    const checkbox = wrapper.find(TODO_CHECKBOX_SELECTOR)
    await checkbox.trigger('change')
    await flushPromises()

    // List still has the item (rolled back)
    expect(wrapper.findAll(TODO_ITEM_SELECTOR)).toHaveLength(1)
  })

  it('shows error notification when toggle fails', async () => {
    fakeTodos = [
      makeTodo({ id: '00000000-0000-4000-8000-000000000001', title: 'A todo' }),
    ]
    const wrapper = mountPage()
    await flushPromises()

    toggleShouldFail = true
    const checkbox = wrapper.find(TODO_CHECKBOX_SELECTOR)
    await checkbox.trigger('change')
    await flushPromises()

    expect(wrapper.find(ERROR_NOTIFICATION_SELECTOR).exists()).toBe(true)
  })

  it('todo list remains visible when delete fails (optimistic rollback)', async () => {
    fakeTodos = [
      makeTodo({ id: '00000000-0000-4000-8000-000000000001', title: 'Stubborn task' }),
    ]
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.findAll(TODO_ITEM_SELECTOR)).toHaveLength(1)

    deleteShouldFail = true
    const deleteBtn = wrapper.find(TODO_DELETE_SELECTOR)
    await deleteBtn.trigger('click')
    await flushPromises()

    // Item reappears after rollback
    expect(wrapper.findAll(TODO_ITEM_SELECTOR)).toHaveLength(1)
  })

  it('shows error notification when delete fails', async () => {
    fakeTodos = [
      makeTodo({ id: '00000000-0000-4000-8000-000000000001', title: 'A todo' }),
    ]
    const wrapper = mountPage()
    await flushPromises()

    deleteShouldFail = true
    await wrapper.find(TODO_DELETE_SELECTOR).trigger('click')
    await flushPromises()

    expect(wrapper.find(ERROR_NOTIFICATION_SELECTOR).exists()).toBe(true)
  })

  it('error auto-dismisses after 5s even after a network failure', async () => {
    fakeTodos = [
      makeTodo({ id: '00000000-0000-4000-8000-000000000001' }),
    ]
    const wrapper = mountPage()
    await flushPromises()

    toggleShouldFail = true
    await wrapper.find(TODO_CHECKBOX_SELECTOR).trigger('change')
    await flushPromises()

    expect(wrapper.find(ERROR_NOTIFICATION_SELECTOR).exists()).toBe(true)

    await vi.advanceTimersByTimeAsync(5000)
    await flushPromises()

    expect(wrapper.find(ERROR_NOTIFICATION_SELECTOR).exists()).toBe(false)
    // List is still present
    expect(wrapper.findAll(TODO_ITEM_SELECTOR)).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// Error display replaces previous error on rapid failures
// ---------------------------------------------------------------------------

describe('pages/index.vue — error message replacement', () => {
  it('a new error replaces the previous one and resets the dismiss timer', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const stub = wrapper.findComponent({ name: 'NewTodoInput' })
    await stub.vm.$emit('error', 'First error')
    await flushPromises()

    // Advance almost to auto-dismiss
    await vi.advanceTimersByTimeAsync(4900)
    await flushPromises()

    // Second error arrives — should replace first and reset timer
    await stub.vm.$emit('error', 'Second error')
    await flushPromises()

    expect(wrapper.find(ERROR_MESSAGE_SELECTOR).text()).toContain('Second error')

    // Advance 4900ms more — should NOT dismiss (timer was reset)
    await vi.advanceTimersByTimeAsync(4900)
    await flushPromises()

    expect(wrapper.find(ERROR_NOTIFICATION_SELECTOR).exists()).toBe(true)

    // Now advance past the reset timer
    await vi.advanceTimersByTimeAsync(200)
    await flushPromises()

    expect(wrapper.find(ERROR_NOTIFICATION_SELECTOR).exists()).toBe(false)
  })
})
