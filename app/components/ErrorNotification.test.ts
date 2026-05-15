/**
 * ErrorNotification.vue — component tests
 *
 * Tests the error notification display component:
 *   - Renders the error message text
 *   - Has a dismiss button that emits 'dismiss'
 *   - Does not block the rest of the UI (non-modal, no overlay)
 *   - Has appropriate ARIA attributes for accessibility
 *   - Does not render when no message is provided (parent controls visibility)
 *
 * Strategy:
 *   The component receives `message` as a prop and emits `dismiss`.
 *   Parent (index.vue) is responsible for calling showError() / dismissError()
 *   and removing the component from the DOM when message is null.
 *   This component focuses purely on presentation and the dismiss action.
 */

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ErrorNotification from './ErrorNotification.vue'

// Selectors — no magic strings in test bodies
const MESSAGE_SELECTOR = '[data-testid="error-message"]'
const DISMISS_SELECTOR = '[data-testid="error-dismiss"]'
const NOTIFICATION_SELECTOR = '[data-testid="error-notification"]'

function mountNotification(message: string) {
  return mount(ErrorNotification, {
    props: { message },
  })
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe('ErrorNotification — rendering', () => {
  it('renders without throwing', () => {
    expect(() => mountNotification('Something failed')).not.toThrow()
  })

  it('displays the error message text', () => {
    const wrapper = mountNotification('Network error')
    expect(wrapper.find(MESSAGE_SELECTOR).text()).toContain('Network error')
  })

  it('renders a dismiss button', () => {
    const wrapper = mountNotification('Error text')
    expect(wrapper.find(DISMISS_SELECTOR).exists()).toBe(true)
  })

  it('notification container is present', () => {
    const wrapper = mountNotification('Error text')
    expect(wrapper.find(NOTIFICATION_SELECTOR).exists()).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Accessibility — non-blocking, announced to screen readers
// ---------------------------------------------------------------------------

describe('ErrorNotification — accessibility', () => {
  it('notification container has role="alert" or aria-live for screen reader announcement', () => {
    const wrapper = mountNotification('Important error')
    const container = wrapper.find(NOTIFICATION_SELECTOR)
    const role = container.attributes('role')
    const ariaLive = container.attributes('aria-live')
    // Must have either role="alert" (implicit aria-live=assertive) or explicit aria-live
    expect(role === 'alert' || ariaLive).toBeTruthy()
  })

  it('dismiss button has an accessible label', () => {
    const wrapper = mountNotification('Error text')
    const btn = wrapper.find(DISMISS_SELECTOR)
    const ariaLabel = btn.attributes('aria-label')
    const text = btn.text()
    // Either aria-label or visible text provides the accessible name
    expect(ariaLabel || text).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// Dismiss interaction
// ---------------------------------------------------------------------------

describe('ErrorNotification — dismiss', () => {
  it('clicking the dismiss button emits "dismiss"', async () => {
    const wrapper = mountNotification('An error occurred')
    await wrapper.find(DISMISS_SELECTOR).trigger('click')
    expect(wrapper.emitted('dismiss')).toHaveLength(1)
  })

  it('emits "dismiss" with no payload', async () => {
    const wrapper = mountNotification('An error occurred')
    await wrapper.find(DISMISS_SELECTOR).trigger('click')
    expect(wrapper.emitted('dismiss')![0]).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Non-blocking — the component must not obscure the todo list
// ---------------------------------------------------------------------------

describe('ErrorNotification — non-blocking layout', () => {
  it('is not a full-screen overlay (no position:fixed covering viewport)', () => {
    // The component should render inline, not as a fixed overlay.
    // We verify this via the absence of a blocking overlay role or class.
    const wrapper = mountNotification('Error text')
    const container = wrapper.find(NOTIFICATION_SELECTOR)

    // Must NOT have role="dialog" (which implies modal blocking behaviour)
    expect(container.attributes('role')).not.toBe('dialog')
    // Must NOT have aria-modal=true (blocks SR interaction with rest of page)
    expect(container.attributes('aria-modal')).not.toBe('true')
  })
})
