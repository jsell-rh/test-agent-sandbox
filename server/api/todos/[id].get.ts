/**
 * GET /api/todos/:id
 *
 * Fetch a single Todo by TodoId.
 *
 * Response 200: TodoResource
 * Response 404: TodoNotFoundError
 */

import { defineEventHandler, getRouterParam, createError } from 'h3'
import { getTodoRepository } from '~/server/plugins/database'
import { toResource } from './_resource'

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

  return toResource(todo)
})
