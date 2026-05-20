import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import TodoFooter from '~/components/TodoFooter.vue'

describe('TodoFooter', () => {
  it('shows singular "item left" when active count is 1', async () => {
    const wrapper = await mountSuspended(TodoFooter, {
      props: { activeCount: 1, completedCount: 0, currentFilter: 'all' },
    })
    expect(wrapper.get('[data-testid="items-left"]').text()).toBe('1 item left')
  })

  it('shows plural "items left" when active count is 0', async () => {
    const wrapper = await mountSuspended(TodoFooter, {
      props: { activeCount: 0, completedCount: 2, currentFilter: 'all' },
    })
    expect(wrapper.get('[data-testid="items-left"]').text()).toBe('0 items left')
  })

  it('shows plural "items left" when active count is 3', async () => {
    const wrapper = await mountSuspended(TodoFooter, {
      props: { activeCount: 3, completedCount: 1, currentFilter: 'all' },
    })
    expect(wrapper.get('[data-testid="items-left"]').text()).toBe('3 items left')
  })

  it('hides "Clear completed" button when completedCount is 0', async () => {
    const wrapper = await mountSuspended(TodoFooter, {
      props: { activeCount: 2, completedCount: 0, currentFilter: 'all' },
    })
    expect(wrapper.find('[data-testid="clear-completed"]').exists()).toBe(false)
  })

  it('shows "Clear completed" button when completedCount > 0', async () => {
    const wrapper = await mountSuspended(TodoFooter, {
      props: { activeCount: 1, completedCount: 3, currentFilter: 'all' },
    })
    expect(wrapper.find('[data-testid="clear-completed"]').exists()).toBe(true)
  })

  it('emits "clear-completed" when Clear completed is clicked', async () => {
    const wrapper = await mountSuspended(TodoFooter, {
      props: { activeCount: 0, completedCount: 2, currentFilter: 'all' },
    })
    await wrapper.get('[data-testid="clear-completed"]').trigger('click')
    expect(wrapper.emitted('clear-completed')).toBeTruthy()
  })

  it('emits "filter-change" when a filter tab is clicked', async () => {
    const wrapper = await mountSuspended(TodoFooter, {
      props: { activeCount: 2, completedCount: 1, currentFilter: 'all' },
    })
    // Find the "Active" filter button inside TodoFilterBar
    const buttons = wrapper.findAll('button')
    const activeButton = buttons.find((b) => b.text() === 'Active')
    await activeButton!.trigger('click')

    expect(wrapper.emitted('filter-change')).toBeTruthy()
    expect(wrapper.emitted('filter-change')![0]).toEqual(['active'])
  })
})
