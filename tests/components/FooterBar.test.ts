/**
 * FooterBar component tests.
 *
 * Verifies spec requirements from specs/interface.spec.md:
 *   - Left: "{N} item(s) left" where N = count of active todos
 *   - Center: Filter tabs
 *   - Right: "Clear completed" button (visible only when completedCount > 0)
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FooterBar from '../../app/components/FooterBar.vue'

function mountFooter(opts: {
  activeCount?: number
  completedCount?: number
  filterCriteria?: 'all' | 'active' | 'completed'
} = {}) {
  return mount(FooterBar, {
    props: {
      activeCount: opts.activeCount ?? 0,
      completedCount: opts.completedCount ?? 0,
      filterCriteria: opts.filterCriteria ?? 'all',
    },
    global: {
      stubs: {
        FilterTabs: {
          name: 'FilterTabs',
          template: '<div data-testid="filter-tabs" />',
          props: ['modelValue'],
          emits: ['update:modelValue'],
        },
      },
    },
  })
}

describe('FooterBar', () => {
  describe('items left count', () => {
    it('displays "{N} items left" for N > 1', () => {
      const wrapper = mountFooter({ activeCount: 3 })
      expect(wrapper.text()).toContain('3 items left')
    })

    it('displays "1 item left" (singular) for N = 1', () => {
      const wrapper = mountFooter({ activeCount: 1 })
      expect(wrapper.text()).toContain('1 item left')
    })

    it('displays "0 items left" for N = 0', () => {
      const wrapper = mountFooter({ activeCount: 0 })
      expect(wrapper.text()).toContain('0 items left')
    })

    it('count updates reactively', async () => {
      const wrapper = mountFooter({ activeCount: 2 })
      expect(wrapper.text()).toContain('2 items left')

      await wrapper.setProps({ activeCount: 5 })
      expect(wrapper.text()).toContain('5 items left')
    })
  })

  describe('clear completed button', () => {
    it('is visible when completedCount > 0', () => {
      const wrapper = mountFooter({ completedCount: 1 })
      expect(wrapper.find('button.clear-completed-btn').exists()).toBe(true)
    })

    it('is hidden when completedCount === 0', () => {
      const wrapper = mountFooter({ completedCount: 0 })
      expect(wrapper.find('button.clear-completed-btn').exists()).toBe(false)
    })

    it('emits "clearCompleted" when clicked', async () => {
      const wrapper = mountFooter({ completedCount: 2 })
      await wrapper.find('button.clear-completed-btn').trigger('click')
      expect(wrapper.emitted('clearCompleted')).toHaveLength(1)
    })
  })

  describe('filter tabs', () => {
    it('renders FilterTabs component', () => {
      const wrapper = mountFooter()
      expect(wrapper.find('[data-testid="filter-tabs"]').exists()).toBe(true)
    })

    it('passes filterCriteria to FilterTabs as modelValue', () => {
      const wrapper = mountFooter({ filterCriteria: 'active' })
      const filterTabs = wrapper.findComponent({ name: 'FilterTabs' })
      expect(filterTabs.props('modelValue')).toBe('active')
    })

    it('emits "filterChange" when FilterTabs emits update:modelValue', async () => {
      const wrapper = mountFooter()
      const filterTabs = wrapper.findComponent({ name: 'FilterTabs' })
      await filterTabs.vm.$emit('update:modelValue', 'completed')
      expect(wrapper.emitted('filterChange')).toHaveLength(1)
      expect(wrapper.emitted('filterChange')![0]).toEqual(['completed'])
    })
  })

  describe('accessibility', () => {
    it('items left count has aria-live="polite"', () => {
      const wrapper = mountFooter({ activeCount: 1 })
      const count = wrapper.find('.footer-count')
      expect(count.attributes('aria-live')).toBe('polite')
    })
  })
})
