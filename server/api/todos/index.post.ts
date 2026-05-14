/**
 * POST /api/todos
 *
 * Create a new Todo. Invokes `Todo.create()`.
 *
 * Request body: { title: string }
 *
 * Response 201: created TodoResource
 * Response 400: missing or non-string title field
 * Response 422: InvalidTitleError (blank / exceeds 500 chars)
 */

import { defineEventHandler, readBody, setResponseStatus } from 'h3'
import { getTodoRepository } from '~/server/plugins/database'
import { Todo } from '~/server/domain/Todo'
import { TodoTitle } from '~/server/domain/value-objects/TodoTitle'
import { InvalidTitleError } from '~/server/domain/errors/InvalidTitleError'
import { badRequest, invalidTitle } from '~/server/utils/errors'
import { toResource } from './_resource'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ title?: unknown }>(event)

  if (!body || typeof body.title !== 'string') {
    throw badRequest('Request body must include a "title" string.')
  }

  let title: TodoTitle
  try {
    title = new TodoTitle(body.title)
  }
  catch (err) {
    if (err instanceof InvalidTitleError) {
      throw invalidTitle(err.message)
    }
    throw err
  }

  const todo = Todo.create(title)
  const repo = getTodoRepository()
  repo.save(todo)

  setResponseStatus(event, 201)
  return toResource(todo)
})
