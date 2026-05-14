/**
 * FilterTabs.vue — unit tests
 *
 * Tests the canonical filter-tab component defined in specs/interface.spec.md:
 *   - Renders three tabs: All, Active, Completed
 *   - Highlights the active tab (aria-current, CSS class)
 *   - Clicking a tab emits update:filter with the correct FilterCriteria value
 *   - Tab label order is: All → Active → Completed
 *
 * Strategy:
 *   Real FilterCriteria constants imported from useTodos — no magic strings.
 *   All tests inject the filter prop directly; no Nuxt runtime needed.
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FilterTabs from './FilterTabs.vue'
import { FILTER_ALL, FILTER_ACTIVE, FILTER_COMPLETED } from '../composables/useTodos'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TAB_SELECTOR = '[data-testid="filter-tab"]'
const ACTIVE_CLASS = 'filter-tab--active'

function mountTabs(filter = FILTER_ALL) {
  return mount(FilterTabs, {
    props: { filter },
  })
}

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

describe('FilterTabs — structure', () => {
  it('renders exactly three tab buttons', () => {
    const wrapper = mountTabs()
    expect(wrapper.findAll(TAB_SELECTOR)).toHaveLength(3)
  })

  it('tab labels are All, Active, Completed in order', () => {
    const wrapper = mountTabs()
    const labels = wrapper.findAll(TAB_SELECTOR).map(tab => tab.text())
    expect(labels).toEqual(['All', 'Active', 'Completed'])
  })

  it('renders inside a nav element for semantics', () => {
    const wrapper = mountTabs()
    expect(wrapper.element.tagName.toLowerCase()).toBe('nav')
  })
})

// ---------------------------------------------------------------------------
// Active state
// ---------------------------------------------------------------------------

describe('FilterTabs — active state', () => {
  it('filter=all marks the All tab as active', () => {
    const wrapper = mountTabs(FILTER_ALL)
    const tabs = wrapper.findAll(TAB_SELECTOR)
    expect(tabs[0]!.classes()).toContain(ACTIVE_CLASS)
    expect(tabs[1]!.classes()).not.toContain(ACTIVE_CLASS)
    expect(tabs[2]!.classes()).not.toContain(ACTIVE_CLASS)
  })

  it('filter=active marks the Active tab as active', () => {
    const wrapper = mountTabs(FILTER_ACTIVE)
    const tabs = wrapper.findAll(TAB_SELECTOR)
    expect(tabs[0]!.classes()).not.toContain(ACTIVE_CLASS)
    expect(tabs[1]!.classes()).toContain(ACTIVE_CLASS)
    expect(tabs[2]!.classes()).not.toContain(ACTIVE_CLASS)
  })

  it('filter=completed marks the Completed tab as active', () => {
    const wrapper = mountTabs(FILTER_COMPLETED)
    const tabs = wrapper.findAll(TAB_SELECTOR)
    expect(tabs[0]!.classes()).not.toContain(ACTIVE_CLASS)
    expect(tabs[1]!.classes()).not.toContain(ACTIVE_CLASS)
    expect(tabs[2]!.classes()).toContain(ACTIVE_CLASS)
  })

  it('active tab has aria-current="true"', () => {
    const wrapper = mountTabs(FILTER_ACTIVE)
    const tabs = wrapper.findAll(TAB_SELECTOR)
    expect(tabs[1]!.attributes('aria-current')).toBe('true')
  })

  it('inactive tabs do not have aria-current attribute', () => {
    const wrapper = mountTabs(FILTER_ALL)
    const tabs = wrapper.findAll(TAB_SELECTOR)
    // Only the active tab should have aria-current
    expect(tabs[1]!.attributes('aria-current')).toBeUndefined()
    expect(tabs[2]!.attributes('aria-current')).toBeUndefined()
  })

  it('updates active class when filter prop changes', async () => {
    const wrapper = mountTabs(FILTER_ALL)
    expect(wrapper.findAll(TAB_SELECTOR)[0]!.classes()).toContain(ACTIVE_CLASS)

    await wrapper.setProps({ filter: FILTER_COMPLETED })
    expect(wrapper.findAll(TAB_SELECTOR)[0]!.classes()).not.toContain(ACTIVE_CLASS)
    expect(wrapper.findAll(TAB_SELECTOR)[2]!.classes()).toContain(ACTIVE_CLASS)
  })
})

// ---------------------------------------------------------------------------
// Interaction — emitting update:filter
// ---------------------------------------------------------------------------

describe('FilterTabs — interaction', () => {
  it('clicking the All tab emits update:filter with FILTER_ALL', async () => {
    const wrapper = mountTabs(FILTER_ACTIVE)
    await wrapper.findAll(TAB_SELECTOR)[0]!.trigger('click')
    expect(wrapper.emitted('update:filter')).toEqual([[FILTER_ALL]])
  })

  it('clicking the Active tab emits update:filter with FILTER_ACTIVE', async () => {
    const wrapper = mountTabs(FILTER_ALL)
    await wrapper.findAll(TAB_SELECTOR)[1]!.trigger('click')
    expect(wrapper.emitted('update:filter')).toEqual([[FILTER_ACTIVE]])
  })

  it('clicking the Completed tab emits update:filter with FILTER_COMPLETED', async () => {
    const wrapper = mountTabs(FILTER_ALL)
    await wrapper.findAll(TAB_SELECTOR)[2]!.trigger('click')
    expect(wrapper.emitted('update:filter')).toEqual([[FILTER_COMPLETED]])
  })

  it('clicking the already-active tab still emits update:filter', async () => {
    const wrapper = mountTabs(FILTER_ALL)
    await wrapper.findAll(TAB_SELECTOR)[0]!.trigger('click')
    // Should still emit — the parent decides whether to suppress duplicates
    expect(wrapper.emitted('update:filter')).toHaveLength(1)
  })
})
