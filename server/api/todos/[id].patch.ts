/**
 * PATCH /api/todos/:id
 *
 * Partial update — supports updating `title` and/or `status` in a single request.
 * Each field is independently optional.
 *
 * Request body (all fields optional):
 *   { title?: string, status?: "active" | "completed" }
 *
 * Domain command mapping:
 *   title present          → todo.updateTitle()
 *   status: "completed"    → todo.complete()
 *   status: "active"       → todo.reopen()
 *
 * Response 200: updated TodoResource
 * Response 400: unknown status value or non-string title
 * Response 404: TodoNotFoundError
 * Response 422: InvalidTitleError
 */

import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { getTodoRepository } from '~/server/plugins/database'
import { TodoTitle } from '~/server/domain/value-objects/TodoTitle'
import { InvalidTitleError } from '~/server/domain/errors/InvalidTitleError'
import { toResource } from './_resource'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!

  const body = await readBody<{ title?: unknown; status?: unknown }>(event)

  const repo = getTodoRepository()
  const todo = repo.findById(id)

  if (!todo) {
    throw createError({
      statusCode: 404,
      data: {
        error: 'TODO_NOT_FOUND',
        message: `No Todo found with id "${id}".`,
      },
      message: `No Todo found with id "${id}".`,
    })
  }

  // Apply status update
  if (body?.status !== undefined) {
    if (body.status === 'completed') {
      todo.complete()
    }
    else if (body.status === 'active') {
      todo.reopen()
    }
    else {
      throw createError({
        statusCode: 400,
        data: {
          error: 'BAD_REQUEST',
          message: `Unknown status value: "${body.status}". Must be "active" or "completed".`,
        },
        message: 'Bad request.',
      })
    }
  }

  // Apply title update
  if (body?.title !== undefined) {
    if (typeof body.title !== 'string') {
      throw createError({
        statusCode: 400,
        data: { error: 'BAD_REQUEST', message: '"title" must be a string.' },
        message: 'Bad request.',
      })
    }
    try {
      todo.updateTitle(new TodoTitle(body.title))
    }
    catch (err) {
      if (err instanceof InvalidTitleError) {
        throw createError({
          statusCode: 422,
          data: { error: 'INVALID_TITLE', message: err.message },
          message: err.message,
        })
      }
      throw err
    }
  }

  repo.save(todo)
  return toResource(todo)
})
