/**
 * Tests for the counts adjustment logic.
 *
 * Mirrors the adjustCounts helper in useTodos without needing Nuxt context.
 */
import { describe, it, expect } from 'vitest'
import type { TodoCounts } from '../app/types/todo'

function adjustCounts(
  current: TodoCounts,
  delta: Partial<TodoCounts>,
): TodoCounts {
  return {
    all: Math.max(0, current.all + (delta.all ?? 0)),
    active: Math.max(0, current.active + (delta.active ?? 0)),
    completed: Math.max(0, current.completed + (delta.completed ?? 0)),
  }
}

describe('adjustCounts', () => {
  const base: TodoCounts = { all: 3, active: 2, completed: 1 }

  it('increments active count when todo is created', () => {
    const result = adjustCounts(base, { all: 1, active: 1 })
    expect(result).toEqual({ all: 4, active: 3, completed: 1 })
  })

  it('shifts counts when active todo is completed', () => {
    const result = adjustCounts(base, { active: -1, completed: 1 })
    expect(result).toEqual({ all: 3, active: 1, completed: 2 })
  })

  it('shifts counts when completed todo is reopened', () => {
    const result = adjustCounts(base, { active: 1, completed: -1 })
    expect(result).toEqual({ all: 3, active: 3, completed: 0 })
  })

  it('decrements all and active when active todo is deleted', () => {
    const result = adjustCounts(base, { all: -1, active: -1 })
    expect(result).toEqual({ all: 2, active: 1, completed: 1 })
  })

  it('clamps counts at zero (never negative)', () => {
    const result = adjustCounts({ all: 0, active: 0, completed: 0 }, { all: -5 })
    expect(result.all).toBe(0)
  })

  it('bulk-clear completed adjusts all and completed', () => {
    const result = adjustCounts(base, { all: -1, completed: -1 })
    expect(result).toEqual({ all: 2, active: 2, completed: 0 })
  })
})
