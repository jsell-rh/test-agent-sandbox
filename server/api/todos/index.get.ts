/**
 * GET /api/todos
 *
 * List all Todos with optional FilterCriteria.
 *
 * Query parameters:
 *   filter: "all" | "active" | "completed"  (default: "all")
 *
 * Response 200:
 *   { todos: TodoResource[], counts: { all, active, completed } }
 *
 * Response 400: invalid filter value
 */

import { defineEventHandler, getQuery, createError } from 'h3'
import { getTodoRepository } from '~/server/plugins/database'
import { FilterCriteria } from '~/server/domain/value-objects/FilterCriteria'
import { toResource } from './_resource'

const VALID_FILTERS = new Set(['all', 'active', 'completed'])

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const filterParam = query.filter as string | undefined

  let filter = FilterCriteria.all

  if (filterParam !== undefined) {
    if (!VALID_FILTERS.has(filterParam)) {
      throw createError({
        statusCode: 400,
        data: {
          error: 'BAD_REQUEST',
          message: `Invalid filter value: "${filterParam}". Must be one of: all, active, completed.`,
        },
        message: `Invalid filter value: "${filterParam}".`,
      })
    }
    filter = filterParam as FilterCriteria
  }

  const repo = getTodoRepository()
  const todos = repo.findAll(filter)
  const counts = repo.counts()

  return {
    todos: todos.map(toResource),
    counts,
  }
})
