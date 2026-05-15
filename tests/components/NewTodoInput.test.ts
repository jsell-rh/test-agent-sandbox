/**
 * NewTodoInput component tests.
 *
 * Verifies spec requirements from specs/interface.spec.md:
 *   - Entering a title and pressing Enter emits 'submit' with trimmed title
 *   - Pressing Escape clears the input without emitting
 *   - Enter on empty string does not emit
 *   - clear() resets the input (for caller to call on API success)
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import NewTodoInput from '../../app/components/NewTodoInput.vue'

function mountInput() {
  return mount(NewTodoInput)
}

describe('NewTodoInput', () => {
  describe('Enter key', () => {
    it('emits "submit" with trimmed title when Enter is pressed on non-empty input', async () => {
      const wrapper = mountInput()
      const input = wrapper.find('input')

      await input.setValue('  Buy groceries  ')
      await input.trigger('keydown', { key: 'Enter' })

      expect(wrapper.emitted('submit')).toHaveLength(1)
      expect(wrapper.emitted('submit')![0]).toEqual(['Buy groceries'])
    })

    it('does NOT clear the input after emitting submit (caller is responsible)', async () => {
      const wrapper = mountInput()
      const input = wrapper.find('input')

      await input.setValue('Task')
      await input.trigger('keydown', { key: 'Enter' })

      // Input should still have the value — parent clears via clear()
      expect((input.element as HTMLInputElement).value).toBe('Task')
    })

    it('does NOT emit "submit" when Enter is pressed on an empty input', async () => {
      const wrapper = mountInput()
      const input = wrapper.find('input')

      await input.setValue('')
      await input.trigger('keydown', { key: 'Enter' })

      expect(wrapper.emitted('submit')).toBeUndefined()
    })

    it('does NOT emit "submit" when Enter is pressed on whitespace-only input', async () => {
      const wrapper = mountInput()
      const input = wrapper.find('input')

      await input.setValue('   ')
      await input.trigger('keydown', { key: 'Enter' })

      expect(wrapper.emitted('submit')).toBeUndefined()
    })
  })

  describe('Escape key', () => {
    it('clears the input without emitting', async () => {
      const wrapper = mountInput()
      const input = wrapper.find('input')

      await input.setValue('Draft text')
      await input.trigger('keydown', { key: 'Escape' })

      expect((input.element as HTMLInputElement).value).toBe('')
      expect(wrapper.emitted('submit')).toBeUndefined()
    })
  })

  describe('clear() method', () => {
    it('clears the input when called via exposed ref', async () => {
      const wrapper = mountInput()
      const input = wrapper.find('input')

      await input.setValue('Some title')

      // Call the exposed clear() method
      await (wrapper.vm as unknown as { clear: () => void }).clear()

      expect((input.element as HTMLInputElement).value).toBe('')
    })
  })

  describe('accessibility', () => {
    it('has an aria-label on the input', () => {
      const wrapper = mountInput()
      const input = wrapper.find('input')
      expect(input.attributes('aria-label')).toBeTruthy()
    })

    it('has placeholder "What needs to be done?"', () => {
      const wrapper = mountInput()
      const input = wrapper.find('input')
      expect(input.attributes('placeholder')).toBe('What needs to be done?')
    })
  })
})
