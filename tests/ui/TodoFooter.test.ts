/**
 * Component tests for TodoFooter.vue.
 *
 * Critical test cases covered:
 * - "Clear completed" button only visible when completedCount > 0
 * - "{N} item(s) left" reflects current active count
 * - Filter tabs show/hide items without additional network request
 * - Footer hidden when no todos exist
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import TodoFooter from '../../components/TodoFooter.vue'
import type { Counts, FilterCriteria, TodoResource } from '../../types/todo'

// ─── Mock factory ──────────────────────────────────────────────────────────────

function makeStoreMock(overrides: {
  counts?: Counts
  filter?: FilterCriteria
  filteredTodos?: TodoResource[]
} = {}) {
  const counts = ref<Counts>(overrides.counts ?? { all: 0, active: 0, completed: 0 })
  const filter = ref<FilterCriteria>(overrides.filter ?? 'all')
  const mockSetFilter = vi.fn((f: FilterCriteria) => { filter.value = f })
  const mockClearCompleted = vi.fn()

  return {
    counts,
    filter,
    filteredTodos: ref(overrides.filteredTodos ?? []),
    setFilter: mockSetFilter,
    clearCompleted: mockClearCompleted,
    todos: ref([]),
    editingTodoId: ref(null),
    errors: ref([]),
    loadTodos: vi.fn(),
    createTodo: vi.fn(),
    toggleTodo: vi.fn(),
    updateTitle: vi.fn(),
    deleteTodo: vi.fn(),
    startEditing: vi.fn(),
    cancelEditing: vi.fn(),
    dismissError: vi.fn(),
    _mockSetFilter: mockSetFilter,
    _mockClearCompleted: mockClearCompleted,
  }
}

let currentMock: ReturnType<typeof makeStoreMock>

vi.mock('../../composables/useTodos', () => ({
  useTodos: () => currentMock,
}))

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TodoFooter.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Visibility ───────────────────────────────────────────────────────────────

  it('is hidden when there are no todos', () => {
    currentMock = makeStoreMock({ counts: { all: 0, active: 0, completed: 0 } })
    const wrapper = mount(TodoFooter)
    expect(wrapper.find('footer').exists()).toBe(false)
  })

  it('is visible when at least one todo exists', () => {
    currentMock = makeStoreMock({ counts: { all: 1, active: 1, completed: 0 } })
    const wrapper = mount(TodoFooter)
    expect(wrapper.find('footer').exists()).toBe(true)
  })

  // ── Items left ────────────────────────────────────────────────────────────────

  it('CRITICAL: shows correct singular "1 item left"', () => {
    currentMock = makeStoreMock({ counts: { all: 1, active: 1, completed: 0 } })
    const wrapper = mount(TodoFooter)
    expect(wrapper.find('[data-testid="items-left"]').text()).toBe('1 item left')
  })

  it('CRITICAL: shows correct plural "N items left"', () => {
    currentMock = makeStoreMock({ counts: { all: 3, active: 3, completed: 0 } })
    const wrapper = mount(TodoFooter)
    expect(wrapper.find('[data-testid="items-left"]').text()).toBe('3 items left')
  })

  it('CRITICAL: "0 items left" when all todos are completed', () => {
    currentMock = makeStoreMock({ counts: { all: 2, active: 0, completed: 2 } })
    const wrapper = mount(TodoFooter)
    expect(wrapper.find('[data-testid="items-left"]').text()).toBe('0 items left')
  })

  // ── Clear completed ────────────────────────────────────────────────────────────

  it('CRITICAL: "Clear completed" button NOT visible when completedCount = 0', () => {
    currentMock = makeStoreMock({ counts: { all: 1, active: 1, completed: 0 } })
    const wrapper = mount(TodoFooter)
    expect(wrapper.find('[data-testid="clear-completed"]').exists()).toBe(false)
  })

  it('CRITICAL: "Clear completed" button IS visible when completedCount > 0', () => {
    currentMock = makeStoreMock({ counts: { all: 2, active: 1, completed: 1 } })
    const wrapper = mount(TodoFooter)
    expect(wrapper.find('[data-testid="clear-completed"]').exists()).toBe(true)
  })

  it('clicking "Clear completed" calls clearCompleted()', async () => {
    currentMock = makeStoreMock({ counts: { all: 2, active: 1, completed: 1 } })
    const wrapper = mount(TodoFooter)
    await wrapper.find('[data-testid="clear-completed"]').trigger('click')
    expect(currentMock._mockClearCompleted).toHaveBeenCalledTimes(1)
  })

  // ── Filter tabs ────────────────────────────────────────────────────────────────

  it('CRITICAL: clicking a filter tab calls setFilter without any network request', async () => {
    currentMock = makeStoreMock({ counts: { all: 3, active: 2, completed: 1 } })
    const wrapper = mount(TodoFooter)

    // Clicking "active" tab
    await wrapper.find('[data-testid="filter-active"]').trigger('click')
    expect(currentMock._mockSetFilter).toHaveBeenCalledWith('active')
    // No API call (loadTodos, etc.) should have been made
    expect(currentMock.loadTodos).not.toHaveBeenCalled()

    // Clicking "completed" tab
    await wrapper.find('[data-testid="filter-completed"]').trigger('click')
    expect(currentMock._mockSetFilter).toHaveBeenCalledWith('completed')
  })

  it('the active filter tab has the "active" CSS class', () => {
    currentMock = makeStoreMock({
      counts: { all: 2, active: 1, completed: 1 },
      filter: 'active',
    })
    const wrapper = mount(TodoFooter)
    expect(wrapper.find('[data-testid="filter-active"]').classes()).toContain('active')
    expect(wrapper.find('[data-testid="filter-all"]').classes()).not.toContain('active')
    expect(wrapper.find('[data-testid="filter-completed"]').classes()).not.toContain('active')
  })
})
