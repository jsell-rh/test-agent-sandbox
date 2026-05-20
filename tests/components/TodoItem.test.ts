import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import TodoItem from '~/components/TodoItem.vue'
import type { Todo } from '~/types/todo'

const ACTIVE_TODO: Todo = {
  id: 'todo-1',
  title: 'Write tests',
  status: 'active',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
}

const COMPLETED_TODO: Todo = {
  ...ACTIVE_TODO,
  id: 'todo-2',
  status: 'completed',
}

describe('TodoItem — display mode', () => {
  it('renders the todo title', async () => {
    const wrapper = await mountSuspended(TodoItem, {
      props: { todo: ACTIVE_TODO, isEditing: false },
    })
    expect(wrapper.text()).toContain('Write tests')
  })

  it('emits "edit-start" with the todo id on double-click', async () => {
    const wrapper = await mountSuspended(TodoItem, {
      props: { todo: ACTIVE_TODO, isEditing: false },
    })
    await wrapper.get('[data-testid="todo-title"]').trigger('dblclick')

    expect(wrapper.emitted('edit-start')).toBeTruthy()
    expect(wrapper.emitted('edit-start')![0]).toEqual(['todo-1'])
  })

  it('emits "toggle" with the todo id when checkbox changes', async () => {
    const wrapper = await mountSuspended(TodoItem, {
      props: { todo: ACTIVE_TODO, isEditing: false },
    })
    await wrapper.get(`#todo-checkbox-${ACTIVE_TODO.id}`).trigger('change')

    expect(wrapper.emitted('toggle')).toBeTruthy()
    expect(wrapper.emitted('toggle')![0]).toEqual(['todo-1'])
  })

  it('emits "delete" with the todo id when delete button is clicked', async () => {
    const wrapper = await mountSuspended(TodoItem, {
      props: { todo: ACTIVE_TODO, isEditing: false },
    })
    await wrapper.get(`[aria-label="Delete todo: ${ACTIVE_TODO.title}"]`).trigger('click')

    expect(wrapper.emitted('delete')).toBeTruthy()
    expect(wrapper.emitted('delete')![0]).toEqual(['todo-1'])
  })
})

describe('TodoItem — edit mode', () => {
  it('shows an edit input pre-filled with current title when isEditing is true', async () => {
    const wrapper = await mountSuspended(TodoItem, {
      props: { todo: ACTIVE_TODO, isEditing: true },
    })
    const editInput = wrapper.get<HTMLInputElement>('[aria-label="Edit todo"]')

    expect(editInput.exists()).toBe(true)
    expect(editInput.element.value).toBe('Write tests')
  })

  it('does not show the title div in edit mode', async () => {
    const wrapper = await mountSuspended(TodoItem, {
      props: { todo: ACTIVE_TODO, isEditing: true },
    })
    expect(wrapper.find('[data-testid="todo-title"]').exists()).toBe(false)
  })

  it('emits "edit-submit" with the new title when Enter is pressed', async () => {
    const wrapper = await mountSuspended(TodoItem, {
      props: { todo: ACTIVE_TODO, isEditing: true },
    })
    const editInput = wrapper.get('[aria-label="Edit todo"]')

    await editInput.setValue('Updated title')
    await editInput.trigger('keydown.enter')

    expect(wrapper.emitted('edit-submit')).toBeTruthy()
    expect(wrapper.emitted('edit-submit')![0]).toEqual(['Updated title'])
  })

  it('emits "edit-cancel" when Escape is pressed (original title preserved)', async () => {
    const wrapper = await mountSuspended(TodoItem, {
      props: { todo: ACTIVE_TODO, isEditing: true },
    })
    const editInput = wrapper.get<HTMLInputElement>('[aria-label="Edit todo"]')

    // Modify value then press Escape
    await editInput.setValue('Changed but cancelled')
    await editInput.trigger('keydown.escape')

    expect(wrapper.emitted('edit-cancel')).toBeTruthy()
    expect(wrapper.emitted('edit-submit')).toBeFalsy()
  })

  it('emits "edit-submit" with empty string when blank title is submitted (parent deletes)', async () => {
    const wrapper = await mountSuspended(TodoItem, {
      props: { todo: ACTIVE_TODO, isEditing: true },
    })
    const editInput = wrapper.get('[aria-label="Edit todo"]')

    await editInput.setValue('')
    await editInput.trigger('keydown.enter')

    expect(wrapper.emitted('edit-submit')).toBeTruthy()
    expect(wrapper.emitted('edit-submit')![0]).toEqual([''])
  })
})
