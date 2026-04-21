import { describe, it, expect, vi } from 'vitest'
import { createError } from 'h3'
import { InvalidTitleError } from '../domain/errors/InvalidTitleError.js'
import { TodoNotFoundError } from '../domain/errors/TodoNotFoundError.js'

// We import formatApiError via a dynamic relative path to avoid the `~` alias
// that is only available in the Nitro/Nuxt runtime.
// The file under test (errorFormatter.ts) itself uses ~ imports, so we need
// to make sure those resolve correctly via the vitest alias config.
import { formatApiError } from './errorFormatter.js'

describe('formatApiError — domain errors', () => {
  it('maps InvalidTitleError to 422 INVALID_TITLE', () => {
    const err = new InvalidTitleError('blank title')
    const result = formatApiError(err)
    expect(result.statusCode).toBe(422)
    expect(result.body.error).toBe('INVALID_TITLE')
    expect(result.body.message).toBe(err.message)
  })

  it('maps TodoNotFoundError to 404 TODO_NOT_FOUND', () => {
    const err = new TodoNotFoundError('abc-123')
    const result = formatApiError(err)
    expect(result.statusCode).toBe(404)
    expect(result.body.error).toBe('TODO_NOT_FOUND')
    expect(result.body.message).toBe(err.message)
  })
})

describe('formatApiError — H3 errors with our data envelope', () => {
  it('passes through statusCode and data.error/message when envelope is set', () => {
    const err = createError({
      statusCode: 422,
      data: { error: 'INVALID_TITLE', message: 'Title is too long.' },
      message: 'Title is too long.',
    })
    const result = formatApiError(err)
    expect(result.statusCode).toBe(422)
    expect(result.body).toEqual({ error: 'INVALID_TITLE', message: 'Title is too long.' })
  })
})

describe('formatApiError — H3 errors without our data envelope', () => {
  it('derives BAD_REQUEST code from a 400 H3Error', () => {
    const err = createError({ statusCode: 400, message: 'Missing field.' })
    const result = formatApiError(err)
    expect(result.statusCode).toBe(400)
    expect(result.body.error).toBe('BAD_REQUEST')
  })

  it('derives INTERNAL_ERROR code from a 500 H3Error', () => {
    const err = createError({ statusCode: 500, message: 'Crash.' })
    const result = formatApiError(err)
    expect(result.statusCode).toBe(500)
    expect(result.body.error).toBe('INTERNAL_ERROR')
  })
})

describe('formatApiError — unknown errors', () => {
  it('maps a plain Error to 500 INTERNAL_ERROR', () => {
    const err = new Error('something went wrong')
    const result = formatApiError(err)
    expect(result.statusCode).toBe(500)
    expect(result.body.error).toBe('INTERNAL_ERROR')
  })

  it('maps a plain string to 500 INTERNAL_ERROR', () => {
    const result = formatApiError('unexpected string error')
    expect(result.statusCode).toBe(500)
    expect(result.body.error).toBe('INTERNAL_ERROR')
  })
})
