/**
 * Vitest global test setup for UI tests.
 *
 * Imported via vitest.ui.config.ts `setupFiles`.
 * Runs before each test file in the UI test suite.
 */

// Make Vue's nextTick available globally in tests
import { nextTick } from 'vue'
;(global as Record<string, unknown>)['nextTick'] = nextTick
