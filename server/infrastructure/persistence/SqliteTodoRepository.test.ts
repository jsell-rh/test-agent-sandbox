/**
 * SqliteTodoRepository — TDD test suite.
 *
 * Each test gets a fresh in-memory SQLite database so tests are fully
 * isolated: no shared state, no file I/O, no cleanup needed.
 *
 * Test plan mirrors the TDD Plan in specs/persistence.spec.md.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { openDatabase } from './DatabaseConnection.js'
import { MigrationRunner } from './MigrationRunner.js'
import { SqliteTodoRepository } from './SqliteTodoRepository.js'
import { Todo } from '../../domain/Todo.js'
import { TodoTitle } from '../../domain/value-objects/TodoTitle.js'
import { TodoStatus } from '../../domain/value-objects/TodoStatus.js'
import { FilterCriteria } from '../../domain/value-objects/FilterCriteria.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Open a fresh in-memory database and apply all migrations. */
function freshDb() {
  const db = openDatabase(':memory:')
  new MigrationRunner(db).run()
  return db
}

/** Create a new active Todo and save it to the repo. */
function seedTodo(repo: SqliteTodoRepository, title = 'Test todo'): Todo {
  const todo = Todo.create(new TodoTitle(title))
  repo.save(todo)
  return todo
}

/** Create a completed Todo and save it to the repo. */
function seedCompletedTodo(repo: SqliteTodoRepository, title = 'Done todo'): Todo {
  const todo = Todo.create(new TodoTitle(title))
  todo.complete()
  repo.save(todo)
  return todo
}

// ---------------------------------------------------------------------------
// findById
// ---------------------------------------------------------------------------

describe('SqliteTodoRepository.findById()', () => {
  let repo: SqliteTodoRepository

  beforeEach(() => {
    repo = new SqliteTodoRepository(freshDb())
  })

  it('returns a fully reconstituted Todo with all fields matching saved values', () => {
    const original = seedTodo(repo, 'Buy groceries')

    const found = repo.findById(original.id)

    expect(found).not.toBeNull()
    expect(found!.id).toBe(original.id)
    expect(found!.title).toBe(original.title)
    expect(found!.status).toBe(original.status)
    expect(found!.createdAt).toBe(original.createdAt)
    expect(found!.updatedAt).toBe(original.updatedAt)
  })

  it('returns null for an unknown TodoId', () => {
    const result = repo.findById('00000000-0000-0000-0000-000000000000')
    expect(result).toBeNull()
  })

  it('reconstituted Todo does not carry any Domain Events', () => {
    seedTodo(repo)

    const found = repo.findById(repo.findAll()[0]!.id)!
    expect(found.domainEvents).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// findAll
// ---------------------------------------------------------------------------

describe('SqliteTodoRepository.findAll()', () => {
  let repo: SqliteTodoRepository

  beforeEach(() => {
    repo = new SqliteTodoRepository(freshDb())
  })

  it('returns empty array when no todos exist', () => {
    expect(repo.findAll()).toEqual([])
  })

  it('returns todos ordered by createdAt descending', async () => {
    const first = Todo.create(new TodoTitle('First'))
    repo.save(first)

    // Ensure distinct timestamps
    await new Promise(r => setTimeout(r, 5))

    const second = Todo.create(new TodoTitle('Second'))
    repo.save(second)

    const todos = repo.findAll()
    expect(todos[0]!.title).toBe('Second')
    expect(todos[1]!.title).toBe('First')
  })

  it('filter: active excludes completed todos', () => {
    seedTodo(repo, 'Active')
    seedCompletedTodo(repo, 'Done')

    const active = repo.findAll(FilterCriteria.active)
    expect(active).toHaveLength(1)
    expect(active[0]!.status).toBe(TodoStatus.active)
  })

  it('filter: completed excludes active todos', () => {
    seedTodo(repo, 'Active')
    seedCompletedTodo(repo, 'Done')

    const completed = repo.findAll(FilterCriteria.completed)
    expect(completed).toHaveLength(1)
    expect(completed[0]!.status).toBe(TodoStatus.completed)
  })

  it('filter: all returns both active and completed todos', () => {
    seedTodo(repo, 'Active')
    seedCompletedTodo(repo, 'Done')

    const all = repo.findAll(FilterCriteria.all)
    expect(all).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// save (insert)
// ---------------------------------------------------------------------------

describe('SqliteTodoRepository.save() — insert', () => {
  let repo: SqliteTodoRepository

  beforeEach(() => {
    repo = new SqliteTodoRepository(freshDb())
  })

  it('persisted todo can be retrieved via findById()', () => {
    const todo = Todo.create(new TodoTitle('Persist me'))
    repo.save(todo)

    const found = repo.findById(todo.id)
    expect(found).not.toBeNull()
    expect(found!.title).toBe('Persist me')
  })

  it('createdAt and updatedAt are identical on first save', () => {
    const todo = Todo.create(new TodoTitle('New'))
    repo.save(todo)

    const found = repo.findById(todo.id)!
    expect(found.createdAt).toBe(found.updatedAt)
  })
})

// ---------------------------------------------------------------------------
// save (update)
// ---------------------------------------------------------------------------

describe('SqliteTodoRepository.save() — update', () => {
  let repo: SqliteTodoRepository

  beforeEach(() => {
    repo = new SqliteTodoRepository(freshDb())
  })

  it('updating title: findById() returns new title', () => {
    const todo = seedTodo(repo, 'Old title')
    todo.updateTitle(new TodoTitle('New title'))
    repo.save(todo)

    const found = repo.findById(todo.id)!
    expect(found.title).toBe('New title')
  })

  it('updating status: findById() returns new status', () => {
    const todo = seedTodo(repo)
    todo.complete()
    repo.save(todo)

    const found = repo.findById(todo.id)!
    expect(found.status).toBe(TodoStatus.completed)
  })

  it('createdAt is unchanged after update', async () => {
    const todo = seedTodo(repo)
    const originalCreatedAt = todo.createdAt

    await new Promise(r => setTimeout(r, 5))
    todo.complete()
    repo.save(todo)

    const found = repo.findById(todo.id)!
    expect(found.createdAt).toBe(originalCreatedAt)
  })

  it('updatedAt is later than createdAt after update', async () => {
    const todo = seedTodo(repo)

    await new Promise(r => setTimeout(r, 5))
    todo.complete()
    repo.save(todo)

    const found = repo.findById(todo.id)!
    expect(new Date(found.updatedAt).getTime()).toBeGreaterThan(
      new Date(found.createdAt).getTime(),
    )
  })
})

// ---------------------------------------------------------------------------
// delete
// ---------------------------------------------------------------------------

describe('SqliteTodoRepository.delete()', () => {
  let repo: SqliteTodoRepository

  beforeEach(() => {
    repo = new SqliteTodoRepository(freshDb())
  })

  it('deleted todo is not returned by findById()', () => {
    const todo = seedTodo(repo)
    repo.delete(todo.id)
    expect(repo.findById(todo.id)).toBeNull()
  })

  it('deleted todo is not returned by findAll()', () => {
    const todo = seedTodo(repo)
    repo.delete(todo.id)
    expect(repo.findAll()).toHaveLength(0)
  })

  it('calling delete on a non-existent id does not throw', () => {
    expect(() => repo.delete('00000000-0000-0000-0000-000000000000')).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// counts
// ---------------------------------------------------------------------------

describe('SqliteTodoRepository.counts()', () => {
  let repo: SqliteTodoRepository

  beforeEach(() => {
    repo = new SqliteTodoRepository(freshDb())
  })

  it('returns zeros on an empty store', () => {
    expect(repo.counts()).toEqual({ all: 0, active: 0, completed: 0 })
  })

  it('correctly counts after mixed inserts', () => {
    seedTodo(repo, 'Active 1')
    seedTodo(repo, 'Active 2')
    seedCompletedTodo(repo, 'Done 1')

    expect(repo.counts()).toEqual({ all: 3, active: 2, completed: 1 })
  })
})
