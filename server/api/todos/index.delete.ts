/**
 * DELETE /api/todos?status=completed
 *
 * Bulk-delete all completed Todos ("Clear completed" action).
 *
 * Required query parameter:
 *   status=completed  (the only supported value)
 *
 * Response 200: { deletedCount: number }
 * Response 400: missing or invalid status parameter
 */

import { defineEventHandler, getQuery, createError } from 'h3'
import { getTodoRepository } from '~/server/plugins/database'
import { FilterCriteria } from '~/server/domain/value-objects/FilterCriteria'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const status = query.status as string | undefined

  if (status !== 'completed') {
    throw createError({
      statusCode: 400,
      data: {
        error: 'BAD_REQUEST',
        message: 'Only ?status=completed is supported for bulk delete.',
      },
      message: 'Bad request.',
    })
  }

  const repo = getTodoRepository()
  const completed = repo.findAll(FilterCriteria.completed)

  for (const todo of completed) {
    repo.delete(todo.id)
  }

  return { deletedCount: completed.length }
})
