/**
 * GET /api/todos/:id
 *
 * Fetch a single Todo by TodoId.
 *
 * Response 200: TodoResource
 * Response 404: TodoNotFoundError
 */

import { defineEventHandler, getRouterParam } from 'h3'
import { getTodoRepository } from '~~/server/plugins/database'
import { notFound } from '~~/server/utils/errors'
import { toResource } from './_resource'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!

  const repo = getTodoRepository()
  const todo = repo.findById(id)

  if (!todo) {
    throw notFound(id)
  }

  return toResource(todo)
})
