/**
 * Tests for TodoItem component.
 *
 * Covers spec-required UI critical test cases:
 * - Double-clicking a title enters edit mode for that item only.
 * - Pressing Escape in edit mode cancels (no emit).
 * - Pressing Enter in edit mode emits submitEdit.
 * - Submitting blank title emits submitEdit with empty string (causes delete upstream).
 * - Clicking delete button emits the 'delete' event.
 * - Checkbox change emits 'toggle'.
 * - Completed todos show line-through styling.
 */
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import TodoItem from '~/components/TodoItem.vue'

function makeTodo(overrides: Partial<{
  id: string
  title: string
  status: 'active' | 'completed'
}> = {}) {
  return {
    id: overrides.id ?? 'todo-1',
    title: overrides.title ?? 'Buy groceries',
    status: overrides.status ?? 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

describe('TodoItem — display mode', () => {
  it('renders the todo title', async () => {
    const wrapper = await mountSuspended(TodoItem, {
      props: { todo: makeTodo({ title: 'Write tests' }), isEditing: false },
    })
    expect(wrapper.text()).toContain('Write tests')
  })

  it('shows a checkbox', async () => {
    const wrapper = await mountSuspended(TodoItem, {
      props: { todo: makeTodo(), isEditing: false },
    })
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true)
  })

  it('checkbox is checked for completed todo', async () => {
    const wrapper = await mountSuspended(TodoItem, {
      props: { todo: makeTodo({ status: 'completed' }), isEditing: false },
    })
    const checkbox = wrapper.find('input[type="checkbox"]')
    expect((checkbox.element as HTMLInputElement).checked).toBe(true)
  })

  it('checkbox is unchecked for active todo', async () => {
    const wrapper = await mountSuspended(TodoItem, {
      props: { todo: makeTodo({ status: 'active' }), isEditing: false },
    })
    const checkbox = wrapper.find('input[type="checkbox"]')
    expect((checkbox.element as HTMLInputElement).checked).toBe(false)
  })

  it('emits toggle when checkbox changes', async () => {
    const todo = makeTodo()
    const wrapper = await mountSuspended(TodoItem, {
      props: { todo, isEditing: false },
    })
    await wrapper.find('input[type="checkbox"]').trigger('change')
    expect(wrapper.emitted('toggle')).toBeTruthy()
    expect(wrapper.emitted('toggle')![0]![0]).toEqual(todo)
  })

  it('emits startEdit on title double-click', async () => {
    const todo = makeTodo({ id: 'dbl-click-id' })
    const wrapper = await mountSuspended(TodoItem, {
      props: { todo, isEditing: false },
    })
    const label = wrapper.find('label')
    await label.trigger('dblclick')
    expect(wrapper.emitted('startEdit')).toBeTruthy()
    expect(wrapper.emitted('startEdit')![0]).toEqual(['dbl-click-id'])
  })

  it('emits delete when delete button is clicked', async () => {
    const todo = makeTodo({ id: 'del-id' })
    const wrapper = await mountSuspended(TodoItem, {
      props: { todo, isEditing: false },
    })
    const deleteBtn = wrapper.find('button[aria-label*="Delete"]')
    await deleteBtn.trigger('click')
    expect(wrapper.emitted('delete')).toBeTruthy()
    expect(wrapper.emitted('delete')![0]).toEqual(['del-id'])
  })

  it('applies line-through style for completed todos', async () => {
    const wrapper = await mountSuspended(TodoItem, {
      props: { todo: makeTodo({ status: 'completed' }), isEditing: false },
    })
    const label = wrapper.find('label')
    expect(label.classes()).toContain('line-through')
  })
})

describe('TodoItem — edit mode', () => {
  it('renders an input field when isEditing is true', async () => {
    const todo = makeTodo({ title: 'Edit me' })
    const wrapper = await mountSuspended(TodoItem, {
      props: { todo, isEditing: true },
    })
    const input = wrapper.find('input[type="text"]')
    expect(input.exists()).toBe(true)
  })

  it('pre-fills the edit input with the current title', async () => {
    const todo = makeTodo({ title: 'Pre-filled title' })
    const wrapper = await mountSuspended(TodoItem, {
      props: { todo, isEditing: true },
    })
    const input = wrapper.find('input[type="text"]')
    expect((input.element as HTMLInputElement).value).toBe('Pre-filled title')
  })

  it('emits cancelEdit on Escape key', async () => {
    const todo = makeTodo()
    const wrapper = await mountSuspended(TodoItem, {
      props: { todo, isEditing: true },
    })
    const input = wrapper.find('input[type="text"]')
    await input.trigger('keydown', { key: 'Escape' })
    expect(wrapper.emitted('cancelEdit')).toBeTruthy()
  })

  it('emits submitEdit with the new title on Enter key', async () => {
    const todo = makeTodo({ title: 'Old title' })
    const wrapper = await mountSuspended(TodoItem, {
      props: { todo, isEditing: true },
    })
    const input = wrapper.find('input[type="text"]')
    await input.setValue('New title')
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('submitEdit')).toBeTruthy()
    const [emittedTodo, emittedTitle] = wrapper.emitted('submitEdit')![0] as [typeof todo, string]
    expect(emittedTodo.id).toBe(todo.id)
    expect(emittedTitle).toBe('New title')
  })

  it('emits submitEdit with empty string when title is cleared (triggers delete upstream)', async () => {
    const todo = makeTodo({ title: 'Delete me' })
    const wrapper = await mountSuspended(TodoItem, {
      props: { todo, isEditing: true },
    })
    const input = wrapper.find('input[type="text"]')
    await input.setValue('   ') // whitespace only → trimmed to empty
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('submitEdit')).toBeTruthy()
    const [, emittedTitle] = wrapper.emitted('submitEdit')![0] as [typeof todo, string]
    expect(emittedTitle).toBe('') // trimmed empty string
  })
})
