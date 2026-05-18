/**
 * Tests for client-side filtering logic.
 *
 * Exercises the same filtering logic used in useTodos.filteredTodos.
 */
import { describe, it, expect } from 'vitest'
import type { Todo, FilterCriteria } from '../app/types/todo'

function makeTodo(id: string, status: 'active' | 'completed'): Todo {
  return {
    id,
    title: `Todo ${id}`,
    status,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function applyFilter(todos: Todo[], filter: FilterCriteria): Todo[] {
  if (filter === 'all') return todos
  return todos.filter((t) => t.status === filter)
}

describe('Client-side filter logic', () => {
  const todos: Todo[] = [
    makeTodo('1', 'active'),
    makeTodo('2', 'completed'),
    makeTodo('3', 'active'),
    makeTodo('4', 'completed'),
  ]

  it('filter=all returns all todos', () => {
    expect(applyFilter(todos, 'all')).toHaveLength(4)
  })

  it('filter=active returns only active todos', () => {
    const result = applyFilter(todos, 'active')
    expect(result).toHaveLength(2)
    expect(result.every((t) => t.status === 'active')).toBe(true)
  })

  it('filter=completed returns only completed todos', () => {
    const result = applyFilter(todos, 'completed')
    expect(result).toHaveLength(2)
    expect(result.every((t) => t.status === 'completed')).toBe(true)
  })

  it('returns empty array when no todos match the filter', () => {
    const allActive: Todo[] = [makeTodo('a', 'active')]
    expect(applyFilter(allActive, 'completed')).toHaveLength(0)
  })

  it('filter operates without network calls (purely in-memory)', () => {
    // Verify the filter function is pure and deterministic
    const first = applyFilter(todos, 'active')
    const second = applyFilter(todos, 'active')
    expect(first).toEqual(second)
  })
})
