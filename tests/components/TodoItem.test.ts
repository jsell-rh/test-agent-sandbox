/**
 * TodoItem component tests.
 *
 * Verifies spec requirements from specs/interface.spec.md:
 *   - Checkbox toggles status via PATCH (emits 'toggle')
 *   - Title renders with markdown (v-html from renderMarkdownInline)
 *   - Double-clicking title enters edit mode (emits 'startEdit')
 *   - Delete button visible on hover, emits 'delete'
 *   - Edit mode: pre-filled input, Enter → 'saveEdit', Escape → 'cancelEdit', blur → 'saveEdit'
 *   - Submitting blank title in edit mode → 'saveEdit' with empty string (parent handles delete)
 *   - Pressing Escape in edit mode restores without emitting saveEdit
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import TodoItem from '../../app/components/TodoItem.vue'
import type { TodoResource } from '../../app/types/todo'

function makeTodo(overrides: Partial<TodoResource> = {}): TodoResource {
  const now = new Date().toISOString()
  return {
    id: 'todo-test-id',
    title: 'Test todo',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function mountItem(todo?: Partial<TodoResource>, isEditing = false) {
  return mount(TodoItem, {
    props: {
      todo: makeTodo(todo),
      isEditing,
    },
  })
}

describe('TodoItem — view mode', () => {
  it('renders the todo title', () => {
    const wrapper = mountItem({ title: 'Buy milk' })
    expect(wrapper.text()).toContain('Buy milk')
  })

  it('checkbox is unchecked for active todos', () => {
    const wrapper = mountItem({ status: 'active' })
    const checkbox = wrapper.find('input[type="checkbox"]')
    expect((checkbox.element as HTMLInputElement).checked).toBe(false)
  })

  it('checkbox is checked for completed todos', () => {
    const wrapper = mountItem({ status: 'completed' })
    const checkbox = wrapper.find('input[type="checkbox"]')
    expect((checkbox.element as HTMLInputElement).checked).toBe(true)
  })

  it('emits "toggle" with the todo id when the checkbox changes', async () => {
    const wrapper = mountItem({ id: 'my-id' })
    await wrapper.find('input[type="checkbox"]').trigger('change')
    expect(wrapper.emitted('toggle')).toHaveLength(1)
    expect(wrapper.emitted('toggle')![0]).toEqual(['my-id'])
  })

  it('emits "startEdit" with the todo id on double-click of title', async () => {
    const wrapper = mountItem({ id: 'my-id' })
    await wrapper.find('.todo-title').trigger('dblclick')
    expect(wrapper.emitted('startEdit')).toHaveLength(1)
    expect(wrapper.emitted('startEdit')![0]).toEqual(['my-id'])
  })

  it('emits "delete" with the todo id when delete button is clicked', async () => {
    const wrapper = mountItem({ id: 'my-id' })
    await wrapper.find('button.todo-delete').trigger('click')
    expect(wrapper.emitted('delete')).toHaveLength(1)
    expect(wrapper.emitted('delete')![0]).toEqual(['my-id'])
  })

  it('delete button exists (keyboard and hover accessible)', () => {
    const wrapper = mountItem()
    expect(wrapper.find('button.todo-delete').exists()).toBe(true)
  })

  it('checkbox has an associated label for accessibility', () => {
    const wrapper = mountItem({ id: 'acc-id' })
    const checkbox = wrapper.find('input[type="checkbox"]')
    const checkboxId = checkbox.attributes('id')
    expect(checkboxId).toBeTruthy()
    const label = wrapper.find(`label[for="${checkboxId}"]`)
    expect(label.exists()).toBe(true)
  })

  it('renders markdown in title (bold text becomes <strong>)', () => {
    const wrapper = mountItem({ title: '**Bold task**' })
    // The title span should contain a <strong> tag from markdown rendering
    const titleEl = wrapper.find('.todo-title')
    expect(titleEl.html()).toContain('<strong>')
  })
})

describe('TodoItem — edit mode', () => {
  it('shows an edit input pre-filled with current title when isEditing is true', () => {
    const wrapper = mountItem({ title: 'Original title' }, true)
    const input = wrapper.find('.todo-edit-input')
    expect(input.exists()).toBe(true)
    expect((input.element as HTMLInputElement).value).toBe('Original title')
  })

  it('does NOT show the view mode elements when editing', () => {
    const wrapper = mountItem({}, true)
    expect(wrapper.find('.todo-view').exists()).toBe(false)
  })

  it('emits "saveEdit" with the id and new title when Enter is pressed', async () => {
    const wrapper = mountItem({ id: 'edit-id', title: 'Old' }, true)
    const input = wrapper.find('.todo-edit-input')

    await input.setValue('New title')
    await input.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('saveEdit')).toHaveLength(1)
    expect(wrapper.emitted('saveEdit')![0]).toEqual(['edit-id', 'New title'])
  })

  it('emits "cancelEdit" when Escape is pressed', async () => {
    const wrapper = mountItem({ id: 'edit-id' }, true)
    const input = wrapper.find('.todo-edit-input')

    await input.trigger('keydown', { key: 'Escape' })

    expect(wrapper.emitted('cancelEdit')).toHaveLength(1)
    expect(wrapper.emitted('cancelEdit')![0]).toEqual(['edit-id'])
    expect(wrapper.emitted('saveEdit')).toBeUndefined()
  })

  it('emits "saveEdit" with trimmed title on blur', async () => {
    const wrapper = mountItem({ id: 'edit-id', title: 'Old' }, true)
    const input = wrapper.find('.todo-edit-input')

    await input.setValue('  Trimmed  ')
    await input.trigger('blur')

    expect(wrapper.emitted('saveEdit')).toHaveLength(1)
    expect(wrapper.emitted('saveEdit')![0]).toEqual(['edit-id', 'Trimmed'])
  })

  it('emits "saveEdit" with empty string when blank input is submitted (caller deletes)', async () => {
    const wrapper = mountItem({ id: 'edit-id', title: 'To delete' }, true)
    const input = wrapper.find('.todo-edit-input')

    await input.setValue('')
    await input.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('saveEdit')).toHaveLength(1)
    expect(wrapper.emitted('saveEdit')![0]).toEqual(['edit-id', ''])
  })

  it('does NOT emit "saveEdit" on blur after Enter was pressed (no duplicate)', async () => {
    const wrapper = mountItem({ id: 'edit-id' }, true)
    const input = wrapper.find('.todo-edit-input')

    await input.setValue('New')
    await input.trigger('keydown', { key: 'Enter' })
    await input.trigger('blur') // blur fires after Enter in browser

    // Should only have one saveEdit emission
    expect(wrapper.emitted('saveEdit')).toHaveLength(1)
  })

  it('does NOT emit "saveEdit" on blur after Escape was pressed', async () => {
    const wrapper = mountItem({ id: 'edit-id' }, true)
    const input = wrapper.find('.todo-edit-input')

    await input.trigger('keydown', { key: 'Escape' })
    await input.trigger('blur')

    expect(wrapper.emitted('saveEdit')).toBeUndefined()
  })

  it('edit input has aria-label announcing editing context', () => {
    const wrapper = mountItem({ title: 'My task' }, true)
    const input = wrapper.find('.todo-edit-input')
    const ariaLabel = input.attributes('aria-label')
    expect(ariaLabel).toBeTruthy()
    expect(ariaLabel!.toLowerCase()).toContain('edit')
  })

  it('resets edit value to current title when isEditing becomes true', async () => {
    const wrapper = mountItem({ title: 'Original' }, false)

    // Enter edit mode
    await wrapper.setProps({ isEditing: true })
    await nextTick()

    const input = wrapper.find('.todo-edit-input')
    expect((input.element as HTMLInputElement).value).toBe('Original')
  })
})
