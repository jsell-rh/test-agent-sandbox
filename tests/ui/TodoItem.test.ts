/**
 * Component tests for TodoItem.vue.
 *
 * Critical test cases covered:
 * - Double-clicking a title enters edit mode for that item only
 * - Pressing Escape in edit mode restores original title (cancels without saving)
 * - Submitting blank title in edit mode deletes the item
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import TodoItem from '../../components/TodoItem.vue'
import type { TodoResource } from '../../types/todo'

// ─── Mock the composable ───────────────────────────────────────────────────────

const mockStartEditing = vi.fn()
const mockCancelEditing = vi.fn()
const mockUpdateTitle = vi.fn()
const mockDeleteTodo = vi.fn()
const mockToggleTodo = vi.fn()

const editingTodoId = ref<string | null>(null)

vi.mock('../../composables/useTodos', () => ({
  useTodos: () => ({
    editingTodoId,
    startEditing: mockStartEditing,
    cancelEditing: mockCancelEditing,
    updateTitle: mockUpdateTitle,
    deleteTodo: mockDeleteTodo,
    toggleTodo: mockToggleTodo,
    todos: ref([]),
    filter: ref('all'),
    counts: ref({ all: 0, active: 0, completed: 0 }),
    errors: ref([]),
    filteredTodos: ref([]),
    loadTodos: vi.fn(),
    createTodo: vi.fn(),
    clearCompleted: vi.fn(),
    setFilter: vi.fn(),
    dismissError: vi.fn(),
  }),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTodo(overrides: Partial<TodoResource> = {}): TodoResource {
  return {
    id: 'todo-1',
    title: 'Test todo',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TodoItem.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    editingTodoId.value = null
  })

  // ── View mode ────────────────────────────────────────────────────────────────

  it('renders the todo title', () => {
    const todo = makeTodo({ title: 'Buy milk' })
    const wrapper = mount(TodoItem, { props: { todo } })
    expect(wrapper.text()).toContain('Buy milk')
  })

  it('applies the "completed" CSS class for completed todos', () => {
    const todo = makeTodo({ status: 'completed' })
    const wrapper = mount(TodoItem, { props: { todo } })
    expect(wrapper.classes()).toContain('completed')
  })

  it('CRITICAL: double-clicking the title calls startEditing with that todo id', async () => {
    const todo = makeTodo()
    const wrapper = mount(TodoItem, { props: { todo } })

    await wrapper.find(`[data-testid="title-${todo.id}"]`).trigger('dblclick')

    expect(mockStartEditing).toHaveBeenCalledWith(todo.id)
    expect(mockStartEditing).toHaveBeenCalledTimes(1)
  })

  it('clicking the delete button calls deleteTodo', async () => {
    const todo = makeTodo()
    const wrapper = mount(TodoItem, { props: { todo } })

    await wrapper.find(`[data-testid="delete-${todo.id}"]`).trigger('click')

    expect(mockDeleteTodo).toHaveBeenCalledWith(todo.id)
  })

  it('clicking the checkbox calls toggleTodo', async () => {
    const todo = makeTodo()
    const wrapper = mount(TodoItem, { props: { todo } })

    await wrapper.find(`[data-testid="checkbox-${todo.id}"]`).trigger('change')

    expect(mockToggleTodo).toHaveBeenCalledWith(todo.id)
  })

  // ── Edit mode ─────────────────────────────────────────────────────────────────

  it('CRITICAL: shows the edit input when editingTodoId matches this todo', async () => {
    const todo = makeTodo()
    editingTodoId.value = todo.id
    const wrapper = mount(TodoItem, { props: { todo } })

    expect(wrapper.find(`[data-testid="edit-input-${todo.id}"]`).exists()).toBe(true)
    expect(wrapper.find(`[data-testid="title-${todo.id}"]`).exists()).toBe(false)
  })

  it('does NOT show edit input for other todo ids', () => {
    const todo = makeTodo({ id: 'todo-1' })
    editingTodoId.value = 'todo-other'
    const wrapper = mount(TodoItem, { props: { todo } })

    expect(wrapper.find(`[data-testid="edit-input-${todo.id}"]`).exists()).toBe(false)
    expect(wrapper.find(`[data-testid="title-${todo.id}"]`).exists()).toBe(true)
  })

  it('CRITICAL: pressing Escape in edit mode calls cancelEditing without saving', async () => {
    const todo = makeTodo({ title: 'Original title' })
    editingTodoId.value = todo.id
    const wrapper = mount(TodoItem, { props: { todo } })

    const editInput = wrapper.find(`[data-testid="edit-input-${todo.id}"]`)
    await editInput.setValue('Changed title')
    await editInput.trigger('keydown', { key: 'Escape' })

    expect(mockCancelEditing).toHaveBeenCalledTimes(1)
    expect(mockUpdateTitle).not.toHaveBeenCalled()
  })

  it('pressing Enter in edit mode calls updateTitle with the current value', async () => {
    mockUpdateTitle.mockResolvedValue(true)
    const todo = makeTodo({ title: 'Old title' })
    editingTodoId.value = todo.id
    const wrapper = mount(TodoItem, { props: { todo } })

    const editInput = wrapper.find(`[data-testid="edit-input-${todo.id}"]`)
    await editInput.setValue('New title')
    await editInput.trigger('keydown', { key: 'Enter' })
    await new Promise((r) => setTimeout(r, 0))

    expect(mockUpdateTitle).toHaveBeenCalledWith(todo.id, 'New title')
  })

  it('CRITICAL: submitting blank title in edit mode calls updateTitle (which deletes)', async () => {
    mockUpdateTitle.mockResolvedValue(true)
    const todo = makeTodo({ title: 'Some todo' })
    editingTodoId.value = todo.id
    const wrapper = mount(TodoItem, { props: { todo } })

    const editInput = wrapper.find(`[data-testid="edit-input-${todo.id}"]`)
    await editInput.setValue('')
    await editInput.trigger('keydown', { key: 'Enter' })
    await new Promise((r) => setTimeout(r, 0))

    // updateTitle delegates to deleteTodo when title is blank (tested in store)
    expect(mockUpdateTitle).toHaveBeenCalledWith(todo.id, '')
  })
})
