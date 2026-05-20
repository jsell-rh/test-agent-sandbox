import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import TodoInput from '~/components/TodoInput.vue'

describe('TodoInput', () => {
  it('emits "create" with trimmed title when Enter is pressed', async () => {
    const wrapper = await mountSuspended(TodoInput)
    const input = wrapper.get('[data-testid="new-todo-input"]')

    await input.setValue('  Buy groceries  ')
    await input.trigger('keydown.enter')

    expect(wrapper.emitted('create')).toBeTruthy()
    expect(wrapper.emitted('create')![0]).toEqual(['Buy groceries'])
  })

  it('does not emit "create" when Enter is pressed with empty input', async () => {
    const wrapper = await mountSuspended(TodoInput)
    const input = wrapper.get('[data-testid="new-todo-input"]')

    await input.setValue('')
    await input.trigger('keydown.enter')

    expect(wrapper.emitted('create')).toBeFalsy()
  })

  it('does not emit "create" when Enter is pressed with whitespace-only input', async () => {
    const wrapper = await mountSuspended(TodoInput)
    const input = wrapper.get('[data-testid="new-todo-input"]')

    await input.setValue('   ')
    await input.trigger('keydown.enter')

    expect(wrapper.emitted('create')).toBeFalsy()
  })

  it('clears the input when Escape is pressed (no create event)', async () => {
    const wrapper = await mountSuspended(TodoInput)
    const input = wrapper.get<HTMLInputElement>('[data-testid="new-todo-input"]')

    await input.setValue('Buy groceries')
    await input.trigger('keydown.escape')

    expect(input.element.value).toBe('')
    expect(wrapper.emitted('create')).toBeFalsy()
  })

  it('does NOT clear the input immediately on Enter (parent must call clear())', async () => {
    // The spec requires input is not cleared on API error.
    // TodoInput only clears via the exposed clear() method called by the parent.
    const wrapper = await mountSuspended(TodoInput)
    const input = wrapper.get<HTMLInputElement>('[data-testid="new-todo-input"]')

    await input.setValue('My task')
    await input.trigger('keydown.enter')

    // Input still has the value — parent hasn't called clear() yet
    expect(input.element.value).toBe('My task')
  })

  it('clears the input when parent calls the exposed clear() method', async () => {
    const wrapper = await mountSuspended(TodoInput)
    const input = wrapper.get<HTMLInputElement>('[data-testid="new-todo-input"]')

    await input.setValue('My task')
    ;(wrapper.vm as unknown as { clear: () => void }).clear()
    await wrapper.vm.$nextTick()

    expect(input.element.value).toBe('')
  })
})
