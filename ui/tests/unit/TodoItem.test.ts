/**
 * Component tests for TodoItem.vue.
 *
 * Focused on keyboard-navigation requirements from interface.spec.md NFRs:
 *   "All actions reachable without a mouse"
 *
 * Critical test cases:
 *   - Title span is focusable (tabindex="0")
 *   - Pressing Enter on the title span emits 'startEdit'
 *   - Pressing F2 on the title span emits 'startEdit'
 *   - Double-clicking the title span emits 'startEdit'
 *   - Pressing Enter in edit mode emits 'submitEdit' with the current value
 *   - Pressing Escape in edit mode emits 'cancelEdit'
 *   - Checkbox change emits 'toggle'
 *   - Delete button click emits 'delete'
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import TodoItem from '../../app/components/TodoItem.vue'
import type { Todo } from '../../app/composables/useTodos'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 'test-id-1',
    title: 'Test todo',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function mountItem(todo: Todo, editing = false) {
  return mount(TodoItem, {
    props: { todo, editing },
    attachTo: document.body,
  })
}

// ---------------------------------------------------------------------------
// Keyboard navigation — NFR: all actions reachable without a mouse
// ---------------------------------------------------------------------------

describe('TodoItem keyboard navigation (view mode)', () => {
  it('title span has tabindex="0" making it keyboard-focusable', () => {
    const wrapper = mountItem(makeTodo())
    const titleSpan = wrapper.find('[tabindex="0"][aria-label]')
    expect(titleSpan.exists()).toBe(true)
    expect(titleSpan.attributes('tabindex')).toBe('0')
  })

  it('pressing Enter on the title span emits startEdit', async () => {
    const wrapper = mountItem(makeTodo())
    const titleSpan = wrapper.find('[tabindex="0"][aria-label]')

    await titleSpan.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('startEdit')).toHaveLength(1)
  })

  it('pressing F2 on the title span emits startEdit', async () => {
    const wrapper = mountItem(makeTodo())
    const titleSpan = wrapper.find('[tabindex="0"][aria-label]')

    await titleSpan.trigger('keydown', { key: 'F2' })

    expect(wrapper.emitted('startEdit')).toHaveLength(1)
  })

  it('double-clicking the title span emits startEdit (existing mouse path)', async () => {
    const wrapper = mountItem(makeTodo())
    const titleSpan = wrapper.find('[tabindex="0"][aria-label]')

    await titleSpan.trigger('dblclick')

    expect(wrapper.emitted('startEdit')).toHaveLength(1)
  })

  it('aria-label mentions the todo title', () => {
    const wrapper = mountItem(makeTodo({ title: 'Buy milk' }))
    const titleSpan = wrapper.find('[tabindex="0"][aria-label]')
    expect(titleSpan.attributes('aria-label')).toContain('Buy milk')
  })
})

// ---------------------------------------------------------------------------
// Checkbox interaction
// ---------------------------------------------------------------------------

describe('TodoItem checkbox', () => {
  it('clicking the checkbox emits toggle', async () => {
    const wrapper = mountItem(makeTodo())
    const checkbox = wrapper.find('input[type="checkbox"]')

    await checkbox.trigger('change')

    expect(wrapper.emitted('toggle')).toHaveLength(1)
  })

  it('checkbox is checked when todo status is completed', () => {
    const wrapper = mountItem(makeTodo({ status: 'completed' }))
    const checkbox = wrapper.find('input[type="checkbox"]')
    expect((checkbox.element as HTMLInputElement).checked).toBe(true)
  })

  it('checkbox is unchecked when todo status is active', () => {
    const wrapper = mountItem(makeTodo({ status: 'active' }))
    const checkbox = wrapper.find('input[type="checkbox"]')
    expect((checkbox.element as HTMLInputElement).checked).toBe(false)
  })

  it('checkbox has an accessible label', () => {
    const wrapper = mountItem(makeTodo())
    const checkbox = wrapper.find('input[type="checkbox"]')
    // Either aria-label on the input or a wrapping <label> with for=id
    const hasAriaLabel = checkbox.attributes('aria-label') !== undefined
    const labelFor = wrapper.find(`label[for="${checkbox.attributes('id')}"]`)
    expect(hasAriaLabel || labelFor.exists()).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Delete button
// ---------------------------------------------------------------------------

describe('TodoItem delete button', () => {
  it('clicking the delete button emits delete', async () => {
    const wrapper = mountItem(makeTodo())
    const deleteBtn = wrapper.find('button[aria-label*="Delete"]')

    await deleteBtn.trigger('click')

    expect(wrapper.emitted('delete')).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// Edit mode — keyboard interaction
// ---------------------------------------------------------------------------

describe('TodoItem edit mode keyboard interaction', () => {
  it('pressing Enter in edit input emits submitEdit with the input value', async () => {
    const wrapper = mountItem(makeTodo({ title: 'Original' }), true)
    const input = wrapper.find('input[type="text"]')

    await input.setValue('Updated title')
    await input.trigger('keydown', { key: 'Enter' })

    const emitted = wrapper.emitted('submitEdit')
    expect(emitted).toHaveLength(1)
    expect(emitted![0]).toEqual(['Updated title'])
  })

  it('pressing Escape in edit input emits cancelEdit', async () => {
    const wrapper = mountItem(makeTodo(), true)
    const input = wrapper.find('input[type="text"]')

    await input.trigger('keydown', { key: 'Escape' })

    expect(wrapper.emitted('cancelEdit')).toHaveLength(1)
    expect(wrapper.emitted('submitEdit')).toBeFalsy()
  })

  it('blurring the edit input emits submitEdit', async () => {
    const wrapper = mountItem(makeTodo({ title: 'Original' }), true)
    const input = wrapper.find('input[type="text"]')

    await input.setValue('Blurred value')
    await input.trigger('blur')

    const emitted = wrapper.emitted('submitEdit')
    expect(emitted).toHaveLength(1)
    expect(emitted![0]).toEqual(['Blurred value'])
  })

  it('edit input is pre-filled with the current todo title', async () => {
    const wrapper = mountItem(makeTodo({ title: 'Pre-filled title' }), true)
    const input = wrapper.find('input[type="text"]')
    expect((input.element as HTMLInputElement).value).toBe('Pre-filled title')
  })

  it('edit input has an accessible aria-label', () => {
    const wrapper = mountItem(makeTodo(), true)
    const input = wrapper.find('input[type="text"]')
    expect(input.attributes('aria-label')).toBeTruthy()
  })
})
