/**
 * Vitest global setup — stubs out Nuxt auto-imports so unit tests can run
 * without the full Nuxt runtime.
 */
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { vi } from 'vitest'

// Expose Vue reactivity primitives globally (Nuxt auto-imports them)
Object.assign(globalThis, { ref, computed, watch, nextTick, onMounted })

// Stub $fetch — individual tests override this with vi.fn() as needed
globalThis.$fetch = vi.fn()

// Stub useHead — no-op in unit tests
globalThis.useHead = vi.fn()

// Stub crypto.randomUUID for error-id generation
if (!globalThis.crypto) {
  // happy-dom provides crypto, but just in case
  let counter = 0
  Object.defineProperty(globalThis, 'crypto', {
    value: { randomUUID: () => `test-uuid-${++counter}` },
  })
}
