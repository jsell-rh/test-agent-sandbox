/**
 * Tests for FooterBar component.
 *
 * Covers spec-required test cases:
 * - "{N} item(s) left" reflects active count.
 * - "Clear completed" button only visible when completedCount > 0.
 * - Footer is not rendered when counts.all === 0.
 */
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import FooterBar from '~/components/FooterBar.vue'

describe('FooterBar', () => {
  it('is not rendered when there are no todos', async () => {
    const wrapper = await mountSuspended(FooterBar, {
      props: {
        counts: { all: 0, active: 0, completed: 0 },
        currentFilter: 'all',
      },
    })
    expect(wrapper.find('footer').exists()).toBe(false)
  })

  it('renders when todos exist', async () => {
    const wrapper = await mountSuspended(FooterBar, {
      props: {
        counts: { all: 2, active: 2, completed: 0 },
        currentFilter: 'all',
      },
    })
    expect(wrapper.find('footer').exists()).toBe(true)
  })

  it('shows "1 item left" (singular) when 1 active todo', async () => {
    const wrapper = await mountSuspended(FooterBar, {
      props: {
        counts: { all: 1, active: 1, completed: 0 },
        currentFilter: 'all',
      },
    })
    expect(wrapper.text()).toContain('1 item left')
  })

  it('shows "N items left" (plural) when multiple active todos', async () => {
    const wrapper = await mountSuspended(FooterBar, {
      props: {
        counts: { all: 3, active: 3, completed: 0 },
        currentFilter: 'all',
      },
    })
    expect(wrapper.text()).toContain('3 items left')
  })

  it('hides "Clear completed" button when no completed todos', async () => {
    const wrapper = await mountSuspended(FooterBar, {
      props: {
        counts: { all: 2, active: 2, completed: 0 },
        currentFilter: 'all',
      },
    })
    expect(wrapper.text()).not.toContain('Clear completed')
  })

  it('shows "Clear completed" button when there are completed todos', async () => {
    const wrapper = await mountSuspended(FooterBar, {
      props: {
        counts: { all: 3, active: 2, completed: 1 },
        currentFilter: 'all',
      },
    })
    expect(wrapper.text()).toContain('Clear completed')
  })

  it('emits clearCompleted when the button is clicked', async () => {
    const wrapper = await mountSuspended(FooterBar, {
      props: {
        counts: { all: 2, active: 1, completed: 1 },
        currentFilter: 'all',
      },
    })
    // Find the "Clear completed" button specifically (not the filter tab buttons)
    const buttons = wrapper.findAll('button')
    const clearBtn = buttons.find((b) => b.text().includes('Clear completed'))
    await clearBtn!.trigger('click')
    expect(wrapper.emitted('clearCompleted')).toBeTruthy()
  })

  it('emits changeFilter when a filter tab is clicked', async () => {
    const wrapper = await mountSuspended(FooterBar, {
      props: {
        counts: { all: 3, active: 2, completed: 1 },
        currentFilter: 'all',
      },
    })
    const tabButtons = wrapper.findAll('[role="tab"]')
    const activeTab = tabButtons.find((b) => b.text().includes('Active'))
    await activeTab?.trigger('click')
    expect(wrapper.emitted('changeFilter')).toBeTruthy()
    expect(wrapper.emitted('changeFilter')![0]).toEqual(['active'])
  })
})
