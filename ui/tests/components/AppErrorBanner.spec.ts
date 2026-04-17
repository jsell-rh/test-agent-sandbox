/**
 * Tests: components/AppErrorBanner.vue
 *
 * Verifies auto-dismiss behaviour and ARIA semantics.
 *
 * Spec: specs/user-interface.spec.md
 * Task: task-012 — Nuxt 4 Application Scaffold
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AppErrorBanner from '~/components/AppErrorBanner.vue'

describe('AppErrorBanner.vue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the error message', async () => {
    const wrapper = await mountSuspended(AppErrorBanner, {
      props: { message: 'Something went wrong' },
    })
    expect(wrapper.text()).toContain('Something went wrong')
  })

  it('has role="alert" for screen reader announcements', async () => {
    const wrapper = await mountSuspended(AppErrorBanner, {
      props: { message: 'Error' },
    })
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
  })

  it('has aria-live="assertive"', async () => {
    const wrapper = await mountSuspended(AppErrorBanner, {
      props: { message: 'Error' },
    })
    expect(wrapper.find('[aria-live="assertive"]').exists()).toBe(true)
  })

  it('emits "dismiss" when the close button is clicked', async () => {
    const wrapper = await mountSuspended(AppErrorBanner, {
      props: { message: 'Error', duration: 10_000 },
    })
    await wrapper.find('.app-error-banner__close').trigger('click')
    expect(wrapper.emitted('dismiss')).toBeTruthy()
  })

  it('emits "dismiss" automatically after the configured duration', async () => {
    const wrapper = await mountSuspended(AppErrorBanner, {
      props: { message: 'Auto-dismiss me', duration: 3_000 },
    })
    expect(wrapper.emitted('dismiss')).toBeFalsy()
    vi.advanceTimersByTime(3_001)
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('dismiss')).toBeTruthy()
  })

  it('defaults to 5000ms dismiss duration', async () => {
    const wrapper = await mountSuspended(AppErrorBanner, {
      props: { message: 'Five second banner' },
    })
    vi.advanceTimersByTime(4_999)
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('dismiss')).toBeFalsy()

    vi.advanceTimersByTime(2)
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('dismiss')).toBeTruthy()
  })
})
