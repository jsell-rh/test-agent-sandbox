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

import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { getTodoRepository } from '~/server/plugins/database'
import { TodoTitle } from '~/server/domain/value-objects/TodoTitle'
import { TodoStatus } from '~/server/domain/value-objects/TodoStatus'
import { InvalidTitleError } from '~/server/domain/errors/InvalidTitleError'
import { notFound, badRequest, invalidTitle } from '~/server/utils/errors'
import { toResource } from './_resource'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!

  const body = await readBody<{ title?: unknown; status?: unknown }>(event)

  const repo = getTodoRepository()
  const todo = repo.findById(id)

  if (!todo) {
    throw notFound(id)
  }

  // Apply status update
  if (body?.status !== undefined) {
    if (body.status === TodoStatus.completed) {
      todo.complete()
    }
    else if (body.status === TodoStatus.active) {
      todo.reopen()
    }
    else {
      throw badRequest(
        `Unknown status value: "${String(body.status)}". Must be "active" or "completed".`,
      )
    }
  }

  // Apply title update
  if (body?.title !== undefined) {
    if (typeof body.title !== 'string') {
      throw badRequest('"title" must be a string.')
    }
    try {
      todo.updateTitle(new TodoTitle(body.title))
    }
    catch (err) {
      if (err instanceof InvalidTitleError) {
        throw invalidTitle(err.message)
      }
      throw err
    }
  }

  repo.save(todo)
  return toResource(todo)
})
