/**
 * Tests for the TodoItem component.
 *
 * Covers:
 *  - Rendering active/completed states
 *  - Toggle checkbox emitting 'toggle'
 *  - Delete button emitting 'delete'
 *  - Double-click entering edit mode (via 'start-edit' emit)
 *  - Edit mode: Enter submits, Escape cancels
 *  - Empty title submit emits 'update-title' with empty string
 *    (the parent composable converts that to a delete)
 *  - Markdown is rendered in the title
 */

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TodoItem from './TodoItem.vue'
import type { Todo } from '~/types/todo'

const baseTodo: Todo = {
  id: 'test-id-1',
  title: 'Buy groceries',
  status: 'active',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

const completedTodo: Todo = { ...baseTodo, status: 'completed' }

// ─────────────────────────────────────────────────────────────────────────────

describe('TodoItem — view mode', () => {
  it('renders the todo title', () => {
    const wrapper = mount(TodoItem, { props: { todo: baseTodo, editing: false } })
    expect(wrapper.text()).toContain('Buy groceries')
  })

  it('checkbox is unchecked for active todo', () => {
    const wrapper = mount(TodoItem, { props: { todo: baseTodo, editing: false } })
    const checkbox = wrapper.find('input[type="checkbox"]')
    expect((checkbox.element as HTMLInputElement).checked).toBe(false)
  })

  it('checkbox is checked for completed todo', () => {
    const wrapper = mount(TodoItem, { props: { todo: completedTodo, editing: false } })
    const checkbox = wrapper.find('input[type="checkbox"]')
    expect((checkbox.element as HTMLInputElement).checked).toBe(true)
  })

  it('has completed CSS class for completed todo', () => {
    const wrapper = mount(TodoItem, { props: { todo: completedTodo, editing: false } })
    expect(wrapper.classes()).toContain('todo-item--completed')
  })

  it('does not have completed CSS class for active todo', () => {
    const wrapper = mount(TodoItem, { props: { todo: baseTodo, editing: false } })
    expect(wrapper.classes()).not.toContain('todo-item--completed')
  })

  it('emits toggle when checkbox is changed', async () => {
    const wrapper = mount(TodoItem, { props: { todo: baseTodo, editing: false } })
    const checkbox = wrapper.find('input[type="checkbox"]')
    await checkbox.trigger('change')
    expect(wrapper.emitted('toggle')).toHaveLength(1)
  })

  it('emits delete when delete button is clicked', async () => {
    const wrapper = mount(TodoItem, { props: { todo: baseTodo, editing: false } })
    const deleteBtn = wrapper.find('button.todo-item__delete')
    await deleteBtn.trigger('click')
    expect(wrapper.emitted('delete')).toHaveLength(1)
  })

  it('emits start-edit on double-click of label', async () => {
    const wrapper = mount(TodoItem, { props: { todo: baseTodo, editing: false } })
    const label = wrapper.find('label.todo-item__label')
    await label.trigger('dblclick')
    expect(wrapper.emitted('start-edit')).toHaveLength(1)
  })

  it('renders markdown in the title (bold)', () => {
    const mdTodo: Todo = { ...baseTodo, title: '**Bold task**' }
    const wrapper = mount(TodoItem, { props: { todo: mdTodo, editing: false } })
    expect(wrapper.html()).toContain('<strong>Bold task</strong>')
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('TodoItem — edit mode', () => {
  it('renders edit input when editing=true', () => {
    const wrapper = mount(TodoItem, { props: { todo: baseTodo, editing: true } })
    expect(wrapper.find('input.todo-item__edit-input').exists()).toBe(true)
    expect(wrapper.find('.todo-item__view').exists()).toBe(false)
  })

  it('edit input is pre-filled with the current title', () => {
    const wrapper = mount(TodoItem, { props: { todo: baseTodo, editing: true } })
    const input = wrapper.find<HTMLInputElement>('input.todo-item__edit-input')
    expect(input.element.value).toBe('Buy groceries')
  })

  it('emits update-title and stop-edit on Enter', async () => {
    const wrapper = mount(TodoItem, { props: { todo: baseTodo, editing: true } })
    const input = wrapper.find('input.todo-item__edit-input')
    await input.setValue('Updated title')
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update-title')).toEqual([['Updated title']])
    expect(wrapper.emitted('stop-edit')).toHaveLength(1)
  })

  it('emits stop-edit but NOT update-title on Escape', async () => {
    const wrapper = mount(TodoItem, { props: { todo: baseTodo, editing: true } })
    const input = wrapper.find('input.todo-item__edit-input')
    await input.setValue('Discarded')
    await input.trigger('keydown', { key: 'Escape' })
    expect(wrapper.emitted('update-title')).toBeUndefined()
    expect(wrapper.emitted('stop-edit')).toHaveLength(1)
  })

  it('emits update-title with empty string when input is cleared and Enter pressed', async () => {
    const wrapper = mount(TodoItem, { props: { todo: baseTodo, editing: true } })
    const input = wrapper.find('input.todo-item__edit-input')
    await input.setValue('')
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update-title')).toEqual([['']])
  })

  it('emits update-title and stop-edit on blur', async () => {
    const wrapper = mount(TodoItem, { props: { todo: baseTodo, editing: true } })
    const input = wrapper.find('input.todo-item__edit-input')
    await input.setValue('Blur save')
    await input.trigger('blur')
    expect(wrapper.emitted('update-title')).toEqual([['Blur save']])
    expect(wrapper.emitted('stop-edit')).toHaveLength(1)
  })
})
