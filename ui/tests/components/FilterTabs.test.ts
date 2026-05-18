/**
 * Tests for FilterTabs component.
 *
 * Verifies that:
 * - The correct tab is marked as active (aria-selected).
 * - Clicking a tab emits the 'change' event with the right FilterCriteria.
 * - Counts are displayed in non-compact mode.
 */
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import FilterTabs from '~/components/FilterTabs.vue'

const COUNTS = { all: 5, active: 3, completed: 2 }

describe('FilterTabs', () => {
  it('marks the current filter tab as aria-selected', async () => {
    const wrapper = await mountSuspended(FilterTabs, {
      props: { current: 'active', counts: COUNTS },
    })
    const buttons = wrapper.findAll('[role="tab"]')
    const activeBtn = buttons.find((b) => b.text().includes('Active'))
    expect(activeBtn?.attributes('aria-selected')).toBe('true')

    const allBtn = buttons.find((b) => b.text().includes('All'))
    expect(allBtn?.attributes('aria-selected')).toBe('false')
  })

  it('emits "change" with the clicked filter value', async () => {
    const wrapper = await mountSuspended(FilterTabs, {
      props: { current: 'all', counts: COUNTS },
    })
    const buttons = wrapper.findAll('[role="tab"]')
    const completedBtn = buttons.find((b) => b.text().includes('Completed'))
    await completedBtn?.trigger('click')

    expect(wrapper.emitted('change')).toBeTruthy()
    expect(wrapper.emitted('change')![0]).toEqual(['completed'])
  })

  it('shows count badges in non-compact mode', async () => {
    const wrapper = await mountSuspended(FilterTabs, {
      props: { current: 'all', counts: COUNTS, compact: false },
    })
    const text = wrapper.text()
    expect(text).toContain('5') // all count
    expect(text).toContain('3') // active count
    expect(text).toContain('2') // completed count
  })

  it('renders all three filter tabs', async () => {
    const wrapper = await mountSuspended(FilterTabs, {
      props: { current: 'all', counts: COUNTS },
    })
    const buttons = wrapper.findAll('[role="tab"]')
    expect(buttons).toHaveLength(3)
    const labels = buttons.map((b) => b.text())
    expect(labels.some((l) => l.includes('All'))).toBe(true)
    expect(labels.some((l) => l.includes('Active'))).toBe(true)
    expect(labels.some((l) => l.includes('Completed'))).toBe(true)
  })
})
