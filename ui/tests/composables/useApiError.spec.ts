/**
 * Tests: composables/useApiError.ts
 *
 * Verifies that API errors of various shapes are normalised correctly.
 *
 * Spec: specs/user-interface.spec.md
 * Task: task-012 — Nuxt 4 Application Scaffold
 */

import { describe, it, expect } from 'vitest'
import { useApiError } from '~/composables/useApiError'

describe('useApiError', () => {
  it('starts with null error message', () => {
    const { errorMessage } = useApiError()
    expect(errorMessage.value).toBeNull()
  })

  it('extracts message from Error instance', () => {
    const { errorMessage, setError } = useApiError()
    setError(new Error('Network timeout'))
    expect(errorMessage.value).toBe('Network timeout')
  })

  it('extracts message from API error envelope { error, message }', () => {
    const { errorMessage, setError } = useApiError()
    setError({ error: 'INVALID_TITLE', message: 'Title cannot be blank' })
    expect(errorMessage.value).toBe('Title cannot be blank')
  })

  it('uses string directly when error is a plain string', () => {
    const { errorMessage, setError } = useApiError()
    setError('Something failed')
    expect(errorMessage.value).toBe('Something failed')
  })

  it('falls back to generic message for unknown error shapes', () => {
    const { errorMessage, setError } = useApiError()
    setError(42)
    expect(errorMessage.value).toBe('An unexpected error occurred.')
  })

  it('clearError resets errorMessage to null', () => {
    const { errorMessage, setError, clearError } = useApiError()
    setError('Some error')
    expect(errorMessage.value).not.toBeNull()
    clearError()
    expect(errorMessage.value).toBeNull()
  })

  it('errorMessage is readonly (cannot be mutated directly)', () => {
    const { errorMessage } = useApiError()
    // @ts-expect-error — testing runtime readonly guard
    expect(() => { errorMessage.value = 'hacked' }).toThrow()
  })
})
