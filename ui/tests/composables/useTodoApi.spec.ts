/**
 * Tests: composables/useTodoApi.ts
 *
 * Verifies that the typed API wrapper calls the correct HTTP endpoints
 * with the right methods and URL shapes.
 *
 * Spec: specs/interface.spec.md — REST API Contract
 * Task: task-012 — Nuxt 4 Application Scaffold
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock $fetch before importing the composable
const fetchMock = vi.fn()
vi.stubGlobal('$fetch', fetchMock)

import { useTodoApi } from '~/composables/useTodoApi'

describe('useTodoApi', () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  it('listTodos calls GET /api/todos?filter=all by default', async () => {
    fetchMock.mockResolvedValue({ items: [], counts: { all: 0, active: 0, completed: 0 } })
    const api = useTodoApi()
    await api.listTodos()
    expect(fetchMock).toHaveBeenCalledWith('/api/todos?filter=all')
  })

  it('listTodos passes the filter parameter', async () => {
    fetchMock.mockResolvedValue({ items: [], counts: { all: 0, active: 0, completed: 0 } })
    const api = useTodoApi()
    await api.listTodos('active')
    expect(fetchMock).toHaveBeenCalledWith('/api/todos?filter=active')
  })

  it('getTodo calls GET /api/todos/:id', async () => {
    fetchMock.mockResolvedValue({ id: 'abc', title: 'Test', status: 'active', createdAt: '', updatedAt: '' })
    const api = useTodoApi()
    await api.getTodo('abc')
    expect(fetchMock).toHaveBeenCalledWith('/api/todos/abc')
  })

  it('createTodo calls POST /api/todos with body', async () => {
    fetchMock.mockResolvedValue({ id: 'new', title: 'My task', status: 'active', createdAt: '', updatedAt: '' })
    const api = useTodoApi()
    await api.createTodo({ title: 'My task' })
    expect(fetchMock).toHaveBeenCalledWith('/api/todos', {
      method: 'POST',
      body: { title: 'My task' },
    })
  })

  it('updateTodo calls PATCH /api/todos/:id with body', async () => {
    fetchMock.mockResolvedValue({ id: 'abc', title: 'Updated', status: 'completed', createdAt: '', updatedAt: '' })
    const api = useTodoApi()
    await api.updateTodo('abc', { status: 'completed' })
    expect(fetchMock).toHaveBeenCalledWith('/api/todos/abc', {
      method: 'PATCH',
      body: { status: 'completed' },
    })
  })

  it('deleteTodo calls DELETE /api/todos/:id', async () => {
    fetchMock.mockResolvedValue(undefined)
    const api = useTodoApi()
    await api.deleteTodo('abc')
    expect(fetchMock).toHaveBeenCalledWith('/api/todos/abc', { method: 'DELETE' })
  })

  it('clearCompleted calls DELETE /api/todos?status=completed', async () => {
    fetchMock.mockResolvedValue(undefined)
    const api = useTodoApi()
    await api.clearCompleted()
    expect(fetchMock).toHaveBeenCalledWith('/api/todos?status=completed', { method: 'DELETE' })
  })
})
