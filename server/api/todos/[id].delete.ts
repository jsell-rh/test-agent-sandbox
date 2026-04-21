/**
 * DELETE /api/todos/:id
 *
 * Permanently delete a single Todo. Invokes `todo.delete()`.
 *
 * Response 204: no body
 * Response 404: TodoNotFoundError
 */

import { defineEventHandler, getRouterParam, setResponseStatus, createError } from 'h3'
import { getTodoRepository } from '~/server/plugins/database'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!

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

  todo.delete()
  repo.delete(todo.id)

  setResponseStatus(event, 204)
  return null
})
