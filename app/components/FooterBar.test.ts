/**
 * FooterBar.vue — unit tests
 *
 * Tests the footer bar contract from specs/interface.spec.md:
 *   - Left: "{N} item(s) left" where N = counts.active
 *   - Centre: FilterTabs component (canonical filter tab set)
 *   - Right: "Clear completed" button — visible only when counts.completed > 0
 *
 * State transitions tested:
 *   - Singular/plural label ("1 item left" vs "2 items left")
 *   - Clear completed button visibility toggled by counts.completed
 *   - Clicking "Clear completed" emits the clear-completed event
 *   - Filter tab changes are proxied as update:filter
 *
 * Strategy:
 *   FilterTabs is stubbed so tests only exercise FooterBar's own behaviour.
 *   Real FilterCriteria constants used throughout — no magic strings.
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FooterBar from './FooterBar.vue'
import { FILTER_ALL, FILTER_ACTIVE, FILTER_COMPLETED } from '../composables/useTodos'
import type { FilterCriteria } from '../composables/useTodos'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ITEMS_LEFT_SELECTOR = '[data-testid="items-left"]'
const CLEAR_COMPLETED_SELECTOR = '[data-testid="clear-completed"]'
const FILTER_TABS_SELECTOR = '[data-testid="filter-tabs"]'

interface Counts {
  all: number
  active: number
  completed: number
}

function makeCounts(overrides: Partial<Counts> = {}): Counts {
  return { all: 0, active: 0, completed: 0, ...overrides }
}

function mountFooter(counts: Counts = makeCounts(), filter: FilterCriteria = FILTER_ALL) {
  return mount(FooterBar, {
    props: { counts, filter },
    global: {
      stubs: {
        // Stub FilterTabs so FooterBar tests stay focused on FooterBar behaviour.
        // The canonical FilterTabs tests live in FilterTabs.test.ts.
        FilterTabs: {
          template: '<div data-testid="filter-tabs"></div>',
          props: ['filter'],
          emits: ['update:filter'],
        },
      },
    },
  })
}

// ---------------------------------------------------------------------------
// Items-left label
// ---------------------------------------------------------------------------

describe('FooterBar — items-left label', () => {
  it('shows "0 items left" when active count is 0', () => {
    const wrapper = mountFooter(makeCounts({ active: 0 }))
    expect(wrapper.find(ITEMS_LEFT_SELECTOR).text()).toContain('0 items left')
  })

  it('shows "1 item left" (singular) when active count is 1', () => {
    const wrapper = mountFooter(makeCounts({ active: 1 }))
    expect(wrapper.find(ITEMS_LEFT_SELECTOR).text()).toContain('1 item left')
  })

  it('shows "2 items left" when active count is 2', () => {
    const wrapper = mountFooter(makeCounts({ active: 2 }))
    expect(wrapper.find(ITEMS_LEFT_SELECTOR).text()).toContain('2 items left')
  })

  it('updates label reactively when counts prop changes', async () => {
    const wrapper = mountFooter(makeCounts({ active: 3 }))
    expect(wrapper.find(ITEMS_LEFT_SELECTOR).text()).toContain('3 items left')

    await wrapper.setProps({ counts: makeCounts({ active: 1 }) })
    expect(wrapper.find(ITEMS_LEFT_SELECTOR).text()).toContain('1 item left')
  })
})

// ---------------------------------------------------------------------------
// FilterTabs integration
// ---------------------------------------------------------------------------

/** Tab selector for the real FilterTabs — used in integration tests below. */
const REAL_FILTER_TAB_SELECTOR = '[data-testid="filter-tab"]'

/** Mount without stubs so FilterTabs participates fully. */
function mountFooterReal(counts: Counts = makeCounts(), filter: FilterCriteria = FILTER_ALL) {
  return mount(FooterBar, { props: { counts, filter } })
}

describe('FooterBar — filter tabs', () => {
  it('renders the FilterTabs stub', () => {
    const wrapper = mountFooter()
    expect(wrapper.find(FILTER_TABS_SELECTOR).exists()).toBe(true)
  })

  it('proxies update:filter from FilterTabs as update:filter on FooterBar', async () => {
    // Use real FilterTabs so clicking a real tab button triggers the chain.
    const wrapper = mountFooterReal()
    const tabs = wrapper.findAll(REAL_FILTER_TAB_SELECTOR)
    await tabs[1]!.trigger('click') // "Active" tab
    expect(wrapper.emitted('update:filter')).toEqual([[FILTER_ACTIVE]])
  })

  it('passes filter prop down to FilterTabs', () => {
    // Use real FilterTabs and check the aria-current on the correct tab.
    const wrapper = mountFooterReal(makeCounts(), FILTER_COMPLETED)
    const tabs = wrapper.findAll(REAL_FILTER_TAB_SELECTOR)
    // The "Completed" tab (index 2) should be marked active.
    expect(tabs[2]!.attributes('aria-current')).toBe('true')
  })
})

// ---------------------------------------------------------------------------
// Clear completed button
// ---------------------------------------------------------------------------

describe('FooterBar — clear completed button', () => {
  it('is hidden when counts.completed is 0', () => {
    const wrapper = mountFooter(makeCounts({ completed: 0 }))
    expect(wrapper.find(CLEAR_COMPLETED_SELECTOR).exists()).toBe(false)
  })

  it('is visible when counts.completed is 1', () => {
    const wrapper = mountFooter(makeCounts({ completed: 1 }))
    expect(wrapper.find(CLEAR_COMPLETED_SELECTOR).exists()).toBe(true)
  })

  it('is visible when counts.completed is greater than 1', () => {
    const wrapper = mountFooter(makeCounts({ completed: 5 }))
    expect(wrapper.find(CLEAR_COMPLETED_SELECTOR).exists()).toBe(true)
  })

  it('appears when counts.completed changes from 0 to 1', async () => {
    const wrapper = mountFooter(makeCounts({ completed: 0 }))
    expect(wrapper.find(CLEAR_COMPLETED_SELECTOR).exists()).toBe(false)

    await wrapper.setProps({ counts: makeCounts({ completed: 1 }) })
    expect(wrapper.find(CLEAR_COMPLETED_SELECTOR).exists()).toBe(true)
  })

  it('disappears when counts.completed changes from 1 to 0', async () => {
    const wrapper = mountFooter(makeCounts({ completed: 1 }))
    expect(wrapper.find(CLEAR_COMPLETED_SELECTOR).exists()).toBe(true)

    await wrapper.setProps({ counts: makeCounts({ completed: 0 }) })
    expect(wrapper.find(CLEAR_COMPLETED_SELECTOR).exists()).toBe(false)
  })

  it('clicking emits clear-completed', async () => {
    const wrapper = mountFooter(makeCounts({ completed: 2 }))
    await wrapper.find(CLEAR_COMPLETED_SELECTOR).trigger('click')
    expect(wrapper.emitted('clear-completed')).toHaveLength(1)
  })

  it('button text is "Clear completed"', () => {
    const wrapper = mountFooter(makeCounts({ completed: 1 }))
    expect(wrapper.find(CLEAR_COMPLETED_SELECTOR).text()).toBe('Clear completed')
  })
})
