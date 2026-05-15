/**
 * FilterTabs component tests.
 *
 * Verifies:
 *   - Three tabs rendered: All, Active, Completed
 *   - Active tab is highlighted (has active class / aria-current)
 *   - Clicking a tab emits update:modelValue with the correct FilterCriteria
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FilterTabs from '../../app/components/FilterTabs.vue'
import { FILTER_LABELS } from '../../app/types/todo'

function mountFilterTabs(modelValue = 'all') {
  return mount(FilterTabs, {
    props: { modelValue },
  })
}

describe('FilterTabs', () => {
  it('renders three filter tabs (All, Active, Completed)', () => {
    const wrapper = mountFilterTabs()
    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(3)
    expect(buttons[0]!.text()).toBe(FILTER_LABELS.all)
    expect(buttons[1]!.text()).toBe(FILTER_LABELS.active)
    expect(buttons[2]!.text()).toBe(FILTER_LABELS.completed)
  })

  it('highlights the active tab with aria-current="page"', () => {
    const wrapper = mountFilterTabs('active')
    const buttons = wrapper.findAll('button')

    expect(buttons[0]!.attributes('aria-current')).toBeUndefined() // All
    expect(buttons[1]!.attributes('aria-current')).toBe('page') // Active (selected)
    expect(buttons[2]!.attributes('aria-current')).toBeUndefined() // Completed
  })

  it('highlights "All" tab by default', () => {
    const wrapper = mountFilterTabs('all')
    const buttons = wrapper.findAll('button')
    expect(buttons[0]!.attributes('aria-current')).toBe('page')
  })

  it('emits "update:modelValue" with "active" when Active tab is clicked', async () => {
    const wrapper = mountFilterTabs('all')
    const buttons = wrapper.findAll('button')

    await buttons[1]!.trigger('click') // Active tab

    expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['active'])
  })

  it('emits "update:modelValue" with "completed" when Completed tab is clicked', async () => {
    const wrapper = mountFilterTabs('all')
    const buttons = wrapper.findAll('button')

    await buttons[2]!.trigger('click') // Completed tab

    expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['completed'])
  })

  it('emits "update:modelValue" with "all" when All tab is clicked', async () => {
    const wrapper = mountFilterTabs('completed')
    const buttons = wrapper.findAll('button')

    await buttons[0]!.trigger('click') // All tab

    expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['all'])
  })

  it('has a nav landmark with an accessible label', () => {
    const wrapper = mountFilterTabs()
    const nav = wrapper.find('nav')
    expect(nav.exists()).toBe(true)
    expect(nav.attributes('aria-label')).toBeTruthy()
  })
})
