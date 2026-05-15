/**
 * TodoItem.vue — component unit tests
 *
 * Tests all behaviours defined in specs/interface.spec.md § "Todo Item Component":
 *   - Renders checkbox, title (markdown), delete button
 *   - Checkbox click emits `toggle`
 *   - Delete button click emits `delete`
 *   - Double-click on title emits `edit-start`
 *   - When isEditing=true: shows edit input pre-filled with current title
 *   - Enter in edit field emits `edit-submit` with the new title
 *   - Blur on edit field emits `edit-submit` with current input value
 *   - Escape in edit field emits `edit-cancel` (blur does NOT also emit edit-submit)
 *   - Enter in edit field: blur does NOT also emit a second edit-submit
 *   - Submitting empty string in edit field emits `edit-submit` with ''
 *   - Markdown in title is rendered as HTML
 *
 * Strategy:
 *   - Components receive data via props and communicate via emits (no global state).
 *   - No network calls — this component has no fetch logic. The parent (index.vue)
 *     handles API calls via useTodos actions.
 *   - `isEditing` prop drives edit mode; the component is controlled by parent.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import TodoItem from './TodoItem.vue'
import { FILTER_ACTIVE, FILTER_COMPLETED } from '../composables/useTodos'
import type { TodoResource } from '../composables/useTodos'

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

/** Mount TodoItem with sensible defaults. */
function mountItem(
  todo: TodoResource = makeTodo(),
  isEditing = false,
) {
  return mount(TodoItem, {
    props: { todo, isEditing },
  })
}

// Selectors kept as constants — no magic strings in test bodies
const CHECKBOX_SELECTOR = '[data-testid="todo-checkbox"]'
const TITLE_SELECTOR = '[data-testid="todo-title"]'
const DELETE_SELECTOR = '[data-testid="todo-delete"]'
const EDIT_INPUT_SELECTOR = '[data-testid="todo-edit-input"]'

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe('TodoItem — rendering', () => {
  it('renders without throwing', () => {
    expect(() => mountItem()).not.toThrow()
  })

  it('renders a checkbox input', () => {
    const wrapper = mountItem()
    expect(wrapper.find(CHECKBOX_SELECTOR).exists()).toBe(true)
    expect(wrapper.find(CHECKBOX_SELECTOR).attributes('type')).toBe('checkbox')
  })

  it('checkbox is unchecked for active todos', () => {
    const wrapper = mountItem(makeTodo({ status: FILTER_ACTIVE }))
    const cb = wrapper.find<HTMLInputElement>(CHECKBOX_SELECTOR)
    expect(cb.element.checked).toBe(false)
  })

  it('checkbox is checked for completed todos', () => {
    const wrapper = mountItem(makeTodo({ status: FILTER_COMPLETED }))
    const cb = wrapper.find<HTMLInputElement>(CHECKBOX_SELECTOR)
    expect(cb.element.checked).toBe(true)
  })

  it('renders the todo title', () => {
    const wrapper = mountItem(makeTodo({ title: 'Buy groceries' }))
    expect(wrapper.find(TITLE_SELECTOR).text()).toContain('Buy groceries')
  })

  it('renders a delete button', () => {
    const wrapper = mountItem()
    expect(wrapper.find(DELETE_SELECTOR).exists()).toBe(true)
  })

  it('does not show edit input when isEditing=false', () => {
    const wrapper = mountItem(makeTodo(), false)
    expect(wrapper.find(EDIT_INPUT_SELECTOR).exists()).toBe(false)
  })

  it('shows edit input when isEditing=true', () => {
    const wrapper = mountItem(makeTodo(), true)
    expect(wrapper.find(EDIT_INPUT_SELECTOR).exists()).toBe(true)
  })

  it('pre-fills edit input with current title', () => {
    const wrapper = mountItem(makeTodo({ title: 'Current title' }), true)
    const input = wrapper.find<HTMLInputElement>(EDIT_INPUT_SELECTOR)
    expect(input.element.value).toBe('Current title')
  })

  it('hides title display when isEditing=true', () => {
    const wrapper = mountItem(makeTodo(), true)
    expect(wrapper.find(TITLE_SELECTOR).exists()).toBe(false)
  })

  it('applies "completed" CSS class for completed todos', () => {
    const wrapper = mountItem(makeTodo({ status: FILTER_COMPLETED }))
    expect(wrapper.find('[data-testid="todo-item"]').classes()).toContain(FILTER_COMPLETED)
  })

  it('does not apply "completed" CSS class for active todos', () => {
    const wrapper = mountItem(makeTodo({ status: FILTER_ACTIVE }))
    expect(wrapper.find('[data-testid="todo-item"]').classes()).not.toContain(FILTER_COMPLETED)
  })
})

// ---------------------------------------------------------------------------
// Markdown rendering
// ---------------------------------------------------------------------------

describe('TodoItem — markdown rendering', () => {
  it('renders bold markdown in the title', () => {
    const wrapper = mountItem(makeTodo({ title: '**bold text**' }))
    const titleEl = wrapper.find(TITLE_SELECTOR)
    expect(titleEl.html()).toContain('<strong>')
  })

  it('renders italic markdown in the title', () => {
    const wrapper = mountItem(makeTodo({ title: '_italic_' }))
    const titleEl = wrapper.find(TITLE_SELECTOR)
    expect(titleEl.html()).toContain('<em>')
  })

  it('renders inline code in the title', () => {
    const wrapper = mountItem(makeTodo({ title: '`code`' }))
    const titleEl = wrapper.find(TITLE_SELECTOR)
    expect(titleEl.html()).toContain('<code>')
  })

  it('sanitizes javascript: protocol in links', () => {
    const wrapper = mountItem(makeTodo({ title: '[click](javascript:alert(1))' }))
    const titleEl = wrapper.find(TITLE_SELECTOR)
    expect(titleEl.html()).not.toContain('javascript:')
  })
})

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

describe('TodoItem — accessibility', () => {
  it('checkbox has an associated label (for attribute)', () => {
    const wrapper = mountItem()
    const cb = wrapper.find(CHECKBOX_SELECTOR)
    const cbId = cb.attributes('id')
    expect(cbId).toBeTruthy()

    // There must be a label element whose "for" attribute matches the checkbox id
    const label = wrapper.find(`label[for="${cbId}"]`)
    expect(label.exists()).toBe(true)
  })

  it('edit input has aria-label when visible', () => {
    const wrapper = mountItem(makeTodo(), true)
    const input = wrapper.find(EDIT_INPUT_SELECTOR)
    expect(input.attributes('aria-label')).toBeTruthy()
  })

  it('edit input aria-label includes the todo title', () => {
    const wrapper = mountItem(makeTodo({ title: 'My specific todo' }), true)
    const input = wrapper.find(EDIT_INPUT_SELECTOR)
    expect(input.attributes('aria-label')).toContain('My specific todo')
  })
})

// ---------------------------------------------------------------------------
// User interactions — checkbox
// ---------------------------------------------------------------------------

describe('TodoItem — checkbox interactions', () => {
  it('clicking checkbox emits "toggle"', async () => {
    const wrapper = mountItem()
    await wrapper.find(CHECKBOX_SELECTOR).trigger('change')
    expect(wrapper.emitted('toggle')).toHaveLength(1)
  })

  it('emits "toggle" with no payload', async () => {
    const wrapper = mountItem()
    await wrapper.find(CHECKBOX_SELECTOR).trigger('change')
    expect(wrapper.emitted('toggle')![0]).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// User interactions — delete button
// ---------------------------------------------------------------------------

describe('TodoItem — delete button', () => {
  it('clicking delete button emits "delete"', async () => {
    const wrapper = mountItem()
    await wrapper.find(DELETE_SELECTOR).trigger('click')
    expect(wrapper.emitted('delete')).toHaveLength(1)
  })

  it('emits "delete" with no payload', async () => {
    const wrapper = mountItem()
    await wrapper.find(DELETE_SELECTOR).trigger('click')
    expect(wrapper.emitted('delete')![0]).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// User interactions — entering edit mode (double-click)
// ---------------------------------------------------------------------------

describe('TodoItem — entering edit mode', () => {
  it('double-clicking title emits "edit-start"', async () => {
    const wrapper = mountItem(makeTodo(), false)
    await wrapper.find(TITLE_SELECTOR).trigger('dblclick')
    expect(wrapper.emitted('edit-start')).toHaveLength(1)
  })

  it('double-click only affects the clicked item (component is isolated)', async () => {
    // Each TodoItem manages its own local state; two separate instances do not interfere
    const itemA = mountItem(makeTodo({ id: 'id-a' }), false)
    const itemB = mountItem(makeTodo({ id: 'id-b' }), false)

    await itemA.find(TITLE_SELECTOR).trigger('dblclick')

    expect(itemA.emitted('edit-start')).toHaveLength(1)
    expect(itemB.emitted('edit-start')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// User interactions — edit mode behaviour
// ---------------------------------------------------------------------------

describe('TodoItem — edit mode', () => {
  it('pressing Enter in edit field emits "edit-submit" with new title', async () => {
    const wrapper = mountItem(makeTodo({ title: 'Original' }), true)
    const input = wrapper.find<HTMLInputElement>(EDIT_INPUT_SELECTOR)

    await input.setValue('Updated title')
    await input.trigger('keydown', { key: 'Enter' })

    const submitted = wrapper.emitted('edit-submit')!
    expect(submitted).toHaveLength(1)
    expect(submitted[0]).toEqual(['Updated title'])
  })

  it('pressing Enter does NOT cause a second edit-submit when blur fires (race condition guard)', async () => {
    // Enter key → edit-submit emitted; subsequent blur (from DOM removal) must be suppressed
    const wrapper = mountItem(makeTodo({ title: 'Original' }), true)
    const input = wrapper.find<HTMLInputElement>(EDIT_INPUT_SELECTOR)

    await input.setValue('Changed')
    await input.trigger('keydown', { key: 'Enter' })
    // Simulate the blur that fires when the input is removed from DOM
    await input.trigger('blur')

    // Only one edit-submit should have been emitted
    expect(wrapper.emitted('edit-submit')).toHaveLength(1)
  })

  it('pressing Escape emits "edit-cancel" without submitting', async () => {
    const wrapper = mountItem(makeTodo({ title: 'Original' }), true)
    const input = wrapper.find<HTMLInputElement>(EDIT_INPUT_SELECTOR)

    await input.setValue('Changed but not saved')
    await input.trigger('keydown', { key: 'Escape' })

    expect(wrapper.emitted('edit-cancel')).toHaveLength(1)
    expect(wrapper.emitted('edit-submit')).toBeUndefined()
  })

  it('pressing Escape does NOT emit edit-submit when blur fires (race condition guard)', async () => {
    // Escape → edit-cancel emitted; subsequent blur must be suppressed, not emit edit-submit
    const wrapper = mountItem(makeTodo({ title: 'Original' }), true)
    const input = wrapper.find<HTMLInputElement>(EDIT_INPUT_SELECTOR)

    await input.setValue('Changed')
    await input.trigger('keydown', { key: 'Escape' })
    // Simulate the blur that fires when the DOM unmounts the input
    await input.trigger('blur')

    expect(wrapper.emitted('edit-submit')).toBeUndefined()
    expect(wrapper.emitted('edit-cancel')).toHaveLength(1)
  })

  it('pressing Escape restores original title (isEditing goes back to false via parent prop)', async () => {
    // The component itself is stateless w.r.t. the title — it always shows
    // the todo.title from props. The parent clears isEditing on cancel.
    // Verify: if isEditing reverts to false, the original title is visible again.
    const wrapper = mountItem(makeTodo({ title: 'Original' }), true)

    // Escape emitted — parent would then set isEditing=false and pass original todo
    await wrapper.find(EDIT_INPUT_SELECTOR).trigger('keydown', { key: 'Escape' })
    await wrapper.setProps({ isEditing: false })

    expect(wrapper.find(TITLE_SELECTOR).exists()).toBe(true)
    expect(wrapper.find(TITLE_SELECTOR).text()).toContain('Original')
  })

  it('blurring edit field emits "edit-submit" with current value', async () => {
    const wrapper = mountItem(makeTodo({ title: 'Original' }), true)
    const input = wrapper.find<HTMLInputElement>(EDIT_INPUT_SELECTOR)

    await input.setValue('Blur submitted')
    await input.trigger('blur')

    const submitted = wrapper.emitted('edit-submit')!
    expect(submitted).toHaveLength(1)
    expect(submitted[0]).toEqual(['Blur submitted'])
  })

  it('submitting blank title emits "edit-submit" with empty string', async () => {
    // Parent interprets empty-string submit as a delete command
    const wrapper = mountItem(makeTodo({ title: 'Will be deleted' }), true)
    const input = wrapper.find<HTMLInputElement>(EDIT_INPUT_SELECTOR)

    await input.setValue('')
    await input.trigger('keydown', { key: 'Enter' })

    const submitted = wrapper.emitted('edit-submit')!
    expect(submitted).toHaveLength(1)
    expect(submitted[0]).toEqual([''])
  })

  it('trimmed whitespace-only input emits "edit-submit" with empty string', async () => {
    const wrapper = mountItem(makeTodo({ title: 'Will be deleted' }), true)
    const input = wrapper.find<HTMLInputElement>(EDIT_INPUT_SELECTOR)

    await input.setValue('   ')
    await input.trigger('keydown', { key: 'Enter' })

    const submitted = wrapper.emitted('edit-submit')!
    expect(submitted[0]).toEqual([''])
  })

  it('edit input value resets to todo.title when isEditing prop transitions to true', async () => {
    // Mount with isEditing=false, then update to true.
    // The local edit text should be reset to the current todo.title.
    const wrapper = mountItem(makeTodo({ title: 'Fresh title' }), false)
    await wrapper.setProps({ isEditing: true })
    await flushPromises()

    const input = wrapper.find<HTMLInputElement>(EDIT_INPUT_SELECTOR)
    expect(input.element.value).toBe('Fresh title')
  })
})

// ---------------------------------------------------------------------------
// Integration: blank submit => parent handles delete
// ---------------------------------------------------------------------------

describe('TodoItem — blank submit maps to delete (integration)', () => {
  it('edit-submit with empty string is handled as delete by parent', async () => {
    // This tests the contract between TodoItem and its parent:
    // TodoItem emits edit-submit(''), parent calls deleteTodo().
    // Here we just verify the event contract is correct.
    const wrapper = mountItem(makeTodo(), true)
    const input = wrapper.find<HTMLInputElement>(EDIT_INPUT_SELECTOR)

    await input.setValue('')
    await input.trigger('keydown', { key: 'Enter' })

    const events = wrapper.emitted('edit-submit')
    expect(events).toBeDefined()
    expect(events![0]).toEqual([''])
    // No 'delete' event directly — the parent routes empty submit to delete
    expect(wrapper.emitted('delete')).toBeUndefined()
  })
})
