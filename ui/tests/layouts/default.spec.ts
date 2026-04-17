/**
 * Tests: layouts/default.vue
 *
 * Verifies that the enterprise layout renders the required ARIA landmark
 * elements with the correct structural classes.
 *
 * Spec: specs/user-interface.spec.md
 * Task: task-012 — Nuxt 4 Application Scaffold
 */

import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import DefaultLayout from '~/layouts/default.vue'

describe('layouts/default.vue', () => {
  it('renders a <header> landmark', async () => {
    const wrapper = await mountSuspended(DefaultLayout)
    const header = wrapper.find('header')
    expect(header.exists()).toBe(true)
  })

  it('renders a <main> landmark with id="main-content"', async () => {
    const wrapper = await mountSuspended(DefaultLayout)
    const main = wrapper.find('main')
    expect(main.exists()).toBe(true)
    expect(main.attributes('id')).toBe('main-content')
  })

  it('renders a <footer> landmark', async () => {
    const wrapper = await mountSuspended(DefaultLayout)
    const footer = wrapper.find('footer')
    expect(footer.exists()).toBe(true)
  })

  it('includes a skip-to-content link pointing to #main-content', async () => {
    const wrapper = await mountSuspended(DefaultLayout)
    const skipLink = wrapper.find('a.skip-link')
    expect(skipLink.exists()).toBe(true)
    expect(skipLink.attributes('href')).toBe('#main-content')
  })

  it('brand link navigates to /', async () => {
    const wrapper = await mountSuspended(DefaultLayout)
    const brand = wrapper.find('.app-header__brand')
    expect(brand.exists()).toBe(true)
    expect(brand.attributes('href')).toBe('/')
  })

  it('applies app-header class to the header element', async () => {
    const wrapper = await mountSuspended(DefaultLayout)
    const header = wrapper.find('header')
    expect(header.classes()).toContain('app-header')
  })

  it('applies app-main class to the main element', async () => {
    const wrapper = await mountSuspended(DefaultLayout)
    const main = wrapper.find('main')
    expect(main.classes()).toContain('app-main')
  })

  it('main has tabindex="-1" for programmatic focus (accessibility)', async () => {
    const wrapper = await mountSuspended(DefaultLayout)
    const main = wrapper.find('main')
    expect(main.attributes('tabindex')).toBe('-1')
  })

  it('header has role="banner"', async () => {
    const wrapper = await mountSuspended(DefaultLayout)
    const header = wrapper.find('header')
    expect(header.attributes('role')).toBe('banner')
  })

  it('main has role="main"', async () => {
    const wrapper = await mountSuspended(DefaultLayout)
    const main = wrapper.find('main')
    expect(main.attributes('role')).toBe('main')
  })

  it('footer has role="contentinfo"', async () => {
    const wrapper = await mountSuspended(DefaultLayout)
    const footer = wrapper.find('footer')
    expect(footer.attributes('role')).toBe('contentinfo')
  })
})
