/**
 * Todo Resource — the JSON shape returned by the API.
 *
 * Defined in the Interface Spec:
 *   { id, title, status, createdAt, updatedAt }
 *
 * Kept in a private helper module (underscore prefix → not a Nitro route).
 * Route handlers import `toResource()` to convert domain Todos to API responses.
 */

import type { Todo } from '~/server/domain/Todo'

/** JSON representation of a Todo, as specified in the Interface Spec. */
export interface TodoResource {
  id: string
  title: string
  status: 'active' | 'completed'
  createdAt: string
  updatedAt: string
}

/**
 * Map a `Todo` aggregate to its API resource representation.
 *
 * This is the ONLY place where domain objects are converted to JSON.
 * No business logic here — pure structural mapping.
 */
export function toResource(todo: Todo): TodoResource {
  return {
    id: todo.id,
    title: todo.title,
    status: todo.status as 'active' | 'completed',
    createdAt: todo.createdAt,
    updatedAt: todo.updatedAt,
  }
}
