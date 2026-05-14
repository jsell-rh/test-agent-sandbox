/**
 * NewTodoInput.vue — component tests
 *
 * Tests the New Todo Input behaviour specified in specs/interface.spec.md
 * (UI Application Layer > New Todo Input):
 *
 *   - Pressing Enter calls the createTodo prop; on success, clears the input
 *   - Pressing Escape clears the input without calling createTodo
 *   - On API error (500), input is NOT cleared and an "error" event is emitted
 *   - Empty title on Enter is a no-op (no API call)
 *   - Whitespace-only title is treated as empty (trimmed before check)
 *
 * Strategy:
 *   `createTodo` is injected as a prop — a vi.fn() fake that resolves or rejects
 *   as needed. This tests real component behaviour without network or Nuxt globals.
 */

import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import NewTodoInput from './NewTodoInput.vue'

// ---------------------------------------------------------------------------
// Constants — mirror the component's data-testid attributes
// ---------------------------------------------------------------------------

const INPUT_SELECTOR = '[data-testid="new-todo-input"]'

// ---------------------------------------------------------------------------
// Mount helper
// ---------------------------------------------------------------------------

function mountComponent(createTodo: (title: string) => Promise<void>) {
  return mount(NewTodoInput, {
    props: { createTodo },
  })
}

// ---------------------------------------------------------------------------
// Enter key — creates a todo
// ---------------------------------------------------------------------------

describe('NewTodoInput — Enter key', () => {
  it('calls createTodo with the trimmed input value', async () => {
    const createTodo = vi.fn().mockResolvedValue(undefined)
    const wrapper = mountComponent(createTodo)

    await wrapper.find(INPUT_SELECTOR).setValue('Buy milk')
    await wrapper.find(INPUT_SELECTOR).trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(createTodo).toHaveBeenCalledOnce()
    expect(createTodo).toHaveBeenCalledWith('Buy milk')
  })

  it('clears the input field after successful creation', async () => {
    const createTodo = vi.fn().mockResolvedValue(undefined)
    const wrapper = mountComponent(createTodo)
    const input = wrapper.find<HTMLInputElement>(INPUT_SELECTOR)

    await input.setValue('Buy milk')
    await input.trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(input.element.value).toBe('')
  })

  it('does not call createTodo when the input is empty', async () => {
    const createTodo = vi.fn()
    const wrapper = mountComponent(createTodo)

    await wrapper.find(INPUT_SELECTOR).trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(createTodo).not.toHaveBeenCalled()
  })

  it('does not call createTodo when the input is whitespace-only', async () => {
    const createTodo = vi.fn()
    const wrapper = mountComponent(createTodo)

    await wrapper.find(INPUT_SELECTOR).setValue('   ')
    await wrapper.find(INPUT_SELECTOR).trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(createTodo).not.toHaveBeenCalled()
  })

  it('trims the title before passing to createTodo', async () => {
    const createTodo = vi.fn().mockResolvedValue(undefined)
    const wrapper = mountComponent(createTodo)

    await wrapper.find(INPUT_SELECTOR).setValue('  Buy milk  ')
    await wrapper.find(INPUT_SELECTOR).trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(createTodo).toHaveBeenCalledWith('Buy milk')
  })
})

// ---------------------------------------------------------------------------
// Escape key — clears without creating
// ---------------------------------------------------------------------------

describe('NewTodoInput — Escape key', () => {
  it('clears the input field without calling createTodo', async () => {
    const createTodo = vi.fn()
    const wrapper = mountComponent(createTodo)
    const input = wrapper.find<HTMLInputElement>(INPUT_SELECTOR)

    await input.setValue('Some typed text')
    await input.trigger('keydown', { key: 'Escape' })

    expect(createTodo).not.toHaveBeenCalled()
    expect(input.element.value).toBe('')
  })
})

// ---------------------------------------------------------------------------
// API error — input preserved, error event emitted
// ---------------------------------------------------------------------------

describe('NewTodoInput — API error handling', () => {
  it('does NOT clear the input when createTodo rejects', async () => {
    const createTodo = vi.fn().mockRejectedValue(new Error('Internal Server Error'))
    const wrapper = mountComponent(createTodo)
    const input = wrapper.find<HTMLInputElement>(INPUT_SELECTOR)

    await input.setValue('Buy milk')
    await input.trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(input.element.value).toBe('Buy milk')
  })

  it('emits an "error" event when createTodo rejects', async () => {
    const createTodo = vi.fn().mockRejectedValue(new Error('Internal Server Error'))
    const wrapper = mountComponent(createTodo)

    await wrapper.find(INPUT_SELECTOR).setValue('Buy milk')
    await wrapper.find(INPUT_SELECTOR).trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(wrapper.emitted('error')).toBeTruthy()
    expect(wrapper.emitted('error')).toHaveLength(1)
  })

  it('includes the error message in the emitted event', async () => {
    const createTodo = vi.fn().mockRejectedValue(new Error('Internal Server Error'))
    const wrapper = mountComponent(createTodo)

    await wrapper.find(INPUT_SELECTOR).setValue('Buy milk')
    await wrapper.find(INPUT_SELECTOR).trigger('keydown', { key: 'Enter' })
    await flushPromises()

    const errorEvents = wrapper.emitted('error') as string[][]
    expect(errorEvents[0]![0]).toBe('Internal Server Error')
  })
})

// ---------------------------------------------------------------------------
// Accessibility and rendering
// ---------------------------------------------------------------------------

describe('NewTodoInput — rendering', () => {
  it('renders an input element with the correct placeholder', () => {
    const wrapper = mountComponent(vi.fn())
    const input = wrapper.find<HTMLInputElement>(INPUT_SELECTOR)

    expect(input.exists()).toBe(true)
    expect(input.element.placeholder).toBe('What needs to be done?')
  })

  it('input has an accessible aria-label', () => {
    const wrapper = mountComponent(vi.fn())
    const input = wrapper.find<HTMLInputElement>(INPUT_SELECTOR)

    expect(input.element.getAttribute('aria-label')).toBeTruthy()
  })
})
