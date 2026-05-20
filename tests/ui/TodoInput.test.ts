/**
 * Component tests for TodoInput.vue.
 *
 * Critical test cases covered:
 * - Entering a title and pressing Enter creates a new item (clears input on success)
 * - Pressing Escape in the new-todo input clears without creating
 * - API error on create: input NOT cleared, error shown
 *
 * The useTodos composable is mocked so these tests run without a Nuxt context.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import TodoInput from '../../components/TodoInput.vue'

// ─── Mock the composable ───────────────────────────────────────────────────────

const mockCreateTodo = vi.fn()

vi.mock('../../composables/useTodos', () => ({
  useTodos: () => ({
    createTodo: mockCreateTodo,
    todos: ref([]),
    filter: ref('all'),
    counts: ref({ all: 0, active: 0, completed: 0 }),
    errors: ref([]),
    editingTodoId: ref(null),
    filteredTodos: ref([]),
    loadTodos: vi.fn(),
    toggleTodo: vi.fn(),
    updateTitle: vi.fn(),
    deleteTodo: vi.fn(),
    clearCompleted: vi.fn(),
    setFilter: vi.fn(),
    startEditing: vi.fn(),
    cancelEditing: vi.fn(),
    dismissError: vi.fn(),
  }),
}))

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TodoInput.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('CRITICAL: pressing Enter creates a todo and clears the input on success', async () => {
    mockCreateTodo.mockResolvedValue(true)
    const wrapper = mount(TodoInput)
    const input = wrapper.find('[data-testid="new-todo-input"]')

    await input.setValue('Buy groceries')
    await input.trigger('keydown', { key: 'Enter' })
    // Allow the async createTodo to settle
    await new Promise((r) => setTimeout(r, 0))

    expect(mockCreateTodo).toHaveBeenCalledWith('Buy groceries')
    expect((input.element as HTMLInputElement).value).toBe('')
  })

  it('does not call createTodo when Enter is pressed with an empty input', async () => {
    const wrapper = mount(TodoInput)
    const input = wrapper.find('[data-testid="new-todo-input"]')

    await input.setValue('')
    await input.trigger('keydown', { key: 'Enter' })

    expect(mockCreateTodo).not.toHaveBeenCalled()
  })

  it('does not call createTodo when Enter is pressed with whitespace only', async () => {
    const wrapper = mount(TodoInput)
    const input = wrapper.find('[data-testid="new-todo-input"]')

    await input.setValue('   ')
    await input.trigger('keydown', { key: 'Enter' })

    expect(mockCreateTodo).not.toHaveBeenCalled()
  })

  it('CRITICAL: pressing Escape clears the input without creating a todo', async () => {
    const wrapper = mount(TodoInput)
    const input = wrapper.find('[data-testid="new-todo-input"]')

    await input.setValue('Some draft text')
    await input.trigger('keydown', { key: 'Escape' })

    expect(mockCreateTodo).not.toHaveBeenCalled()
    expect((input.element as HTMLInputElement).value).toBe('')
  })

  it('CRITICAL: does NOT clear the input when the API returns an error', async () => {
    mockCreateTodo.mockResolvedValue(false)
    const wrapper = mount(TodoInput)
    const input = wrapper.find('[data-testid="new-todo-input"]')

    await input.setValue('Failing todo')
    await input.trigger('keydown', { key: 'Enter' })
    await new Promise((r) => setTimeout(r, 0))

    expect(mockCreateTodo).toHaveBeenCalled()
    // Input is preserved because createTodo returned false
    expect((input.element as HTMLInputElement).value).toBe('Failing todo')
  })

  it('passes only the trimmed title to createTodo', async () => {
    mockCreateTodo.mockResolvedValue(true)
    const wrapper = mount(TodoInput)
    const input = wrapper.find('[data-testid="new-todo-input"]')

    await input.setValue('  padded  ')
    await input.trigger('keydown', { key: 'Enter' })
    await new Promise((r) => setTimeout(r, 0))

    expect(mockCreateTodo).toHaveBeenCalledWith('padded')
  })
})
