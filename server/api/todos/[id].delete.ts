/**
 * DELETE /api/todos/:id
 *
 * Permanently delete a single Todo. Invokes `todo.delete()`.
 *
 * Response 204: no body
 * Response 404: TodoNotFoundError
 */

import { defineEventHandler, getRouterParam, sendNoContent } from 'h3'
import { getTodoRepository } from '~~/server/plugins/database'
import { notFound } from '~~/server/utils/errors'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!

  const repo = getTodoRepository()
  const todo = repo.findById(id)

  if (!todo) {
    throw notFound(id)
  }

  todo.delete()
  repo.delete(todo.id)

  // Send 204 No Content — spec requires no response body.
  // `sendNoContent` (H3) sets the status and ends the response without serialising anything.
  return sendNoContent(event, 204)
})
