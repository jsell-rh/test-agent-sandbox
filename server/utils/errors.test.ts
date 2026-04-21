import { describe, it, expect } from 'vitest'
import { apiError, notFound, invalidTitle, badRequest, internalError } from './errors'

describe('apiError', () => {
  it('sets the correct statusCode', () => {
    const err = apiError(404, 'TODO_NOT_FOUND', 'Not found.')
    expect(err.statusCode).toBe(404)
  })

  it('sets the data envelope with error and message', () => {
    const err = apiError(422, 'INVALID_TITLE', 'Title is blank.')
    expect(err.data).toEqual({ error: 'INVALID_TITLE', message: 'Title is blank.' })
  })

  it('sets the error message', () => {
    const err = apiError(400, 'BAD_REQUEST', 'Bad input.')
    expect(err.message).toBe('Bad input.')
  })
})

describe('notFound', () => {
  it('returns 404 with TODO_NOT_FOUND and default message', () => {
    const err = notFound()
    expect(err.statusCode).toBe(404)
    expect((err.data as { error: string }).error).toBe('TODO_NOT_FOUND')
    expect(err.message).toBe('Todo not found.')
  })

  it('uses a custom message when provided', () => {
    const err = notFound('custom message')
    expect(err.message).toBe('custom message')
    expect((err.data as { message: string }).message).toBe('custom message')
  })
})

describe('invalidTitle', () => {
  it('returns 422 with INVALID_TITLE and the given message', () => {
    const err = invalidTitle('Title must not be blank.')
    expect(err.statusCode).toBe(422)
    expect((err.data as { error: string }).error).toBe('INVALID_TITLE')
    expect(err.message).toBe('Title must not be blank.')
  })
})

describe('badRequest', () => {
  it('returns 400 with BAD_REQUEST and the given message', () => {
    const err = badRequest('Invalid JSON.')
    expect(err.statusCode).toBe(400)
    expect((err.data as { error: string }).error).toBe('BAD_REQUEST')
    expect(err.message).toBe('Invalid JSON.')
  })
})

describe('internalError', () => {
  it('returns 500 with INTERNAL_ERROR and the default message', () => {
    const err = internalError()
    expect(err.statusCode).toBe(500)
    expect((err.data as { error: string }).error).toBe('INTERNAL_ERROR')
    expect(err.message).toBe('An unexpected error occurred.')
  })
})
