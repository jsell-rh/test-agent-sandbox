/**
 * SqliteTodoRepository — TDD test suite.
 *
 * Each test gets a fresh in-memory SQLite database so tests are fully
 * isolated: no shared state, no file I/O, no cleanup needed.
 *
 * Test plan mirrors the TDD Plan in specs/persistence.spec.md.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
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
function freshDb(): Database.Database {
  const db = openDatabase(':memory:')
  new MigrationRunner(db).run()
  return db
}

/** Create a new active Todo and save it to the repo. */
function seedTodo(
  repo: SqliteTodoRepository,
  title = 'Test todo',
): Todo {
  const todo = Todo.create(new TodoTitle(title))
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
    const original = seedTodo(repo)
    original.clearDomainEvents() // the original has TodoCreated

    const found = repo.findById(original.id)

    expect(found!.domainEvents).toHaveLength(0)
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
    // Insert with explicit ordering by sleeping 1 ms between inserts
    const first = Todo.create(new TodoTitle('First'))
    repo.save(first)

    await new Promise(r => setTimeout(r, 5)) // ensure different timestamp

    const second = Todo.create(new TodoTitle('Second'))
    repo.save(second)

    const todos = repo.findAll()

    expect(todos).toHaveLength(2)
    expect(todos[0]!.id).toBe(second.id) // newest first
    expect(todos[1]!.id).toBe(first.id)
  })

  it('filter: all returns both active and completed todos', () => {
    const active = seedTodo(repo, 'Active todo')
    const completed = Todo.create(new TodoTitle('Completed todo'))
    completed.complete()
    repo.save(completed)

    const todos = repo.findAll(FilterCriteria.all)

    const ids = todos.map(t => t.id)
    expect(ids).toContain(active.id)
    expect(ids).toContain(completed.id)
    expect(todos).toHaveLength(2)
  })

  it('filter: active excludes completed todos', () => {
    const active = seedTodo(repo, 'Active')
    const completed = Todo.create(new TodoTitle('Completed'))
    completed.complete()
    repo.save(completed)

    const todos = repo.findAll(FilterCriteria.active)

    expect(todos).toHaveLength(1)
    expect(todos[0]!.id).toBe(active.id)
    expect(todos[0]!.status).toBe(TodoStatus.active)
  })

  it('filter: completed excludes active todos', () => {
    seedTodo(repo, 'Active')
    const completed = Todo.create(new TodoTitle('Completed'))
    completed.complete()
    repo.save(completed)

    const todos = repo.findAll(FilterCriteria.completed)

    expect(todos).toHaveLength(1)
    expect(todos[0]!.status).toBe(TodoStatus.completed)
  })

  it('calling findAll with no filter returns all todos (same as "all")', () => {
    seedTodo(repo, 'One')
    const two = Todo.create(new TodoTitle('Two'))
    two.complete()
    repo.save(two)

    expect(repo.findAll()).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// save — insert
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
    const todo = Todo.create(new TodoTitle('Fresh'))
    repo.save(todo)

    const found = repo.findById(todo.id)!
    expect(found.createdAt).toBe(found.updatedAt)
  })

  it('saved todo has status active by default', () => {
    const todo = Todo.create(new TodoTitle('Active by default'))
    repo.save(todo)

    const found = repo.findById(todo.id)!
    expect(found.status).toBe(TodoStatus.active)
  })
})

// ---------------------------------------------------------------------------
// save — update
// ---------------------------------------------------------------------------

describe('SqliteTodoRepository.save() — update', () => {
  let repo: SqliteTodoRepository

  beforeEach(() => {
    repo = new SqliteTodoRepository(freshDb())
  })

  it('updating title: findById() returns new title', async () => {
    const todo = seedTodo(repo, 'Old title')
    await new Promise(r => setTimeout(r, 5))

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
    const todo = seedTodo(repo, 'Original')
    const originalCreatedAt = todo.createdAt

    await new Promise(r => setTimeout(r, 5))
    todo.updateTitle(new TodoTitle('Updated'))
    repo.save(todo)

    const found = repo.findById(todo.id)!
    expect(found.createdAt).toBe(originalCreatedAt)
  })

  it('updatedAt is later than createdAt after update', async () => {
    const todo = seedTodo(repo, 'Will be updated')
    await new Promise(r => setTimeout(r, 5))

    todo.updateTitle(new TodoTitle('Updated'))
    repo.save(todo)

    const found = repo.findById(todo.id)!
    expect(found.updatedAt > found.createdAt).toBe(true)
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
    expect(() => {
      repo.delete('00000000-0000-0000-0000-000000000000')
    }).not.toThrow()
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

  it('returns all zeros on empty store', () => {
    expect(repo.counts()).toEqual({ all: 0, active: 0, completed: 0 })
  })

  it('correctly counts after mixed inserts', () => {
    seedTodo(repo, 'Active 1')
    seedTodo(repo, 'Active 2')

    const completed = Todo.create(new TodoTitle('Completed 1'))
    completed.complete()
    repo.save(completed)

    const counts = repo.counts()
    expect(counts.all).toBe(3)
    expect(counts.active).toBe(2)
    expect(counts.completed).toBe(1)
  })

  it('counts reflect status changes after save', () => {
    const todo = seedTodo(repo, 'Will complete')
    expect(repo.counts().active).toBe(1)
    expect(repo.counts().completed).toBe(0)

    todo.complete()
    repo.save(todo)

    expect(repo.counts().active).toBe(0)
    expect(repo.counts().completed).toBe(1)
  })

  it('counts decrease after delete', () => {
    const todo = seedTodo(repo, 'Will be deleted')
    expect(repo.counts().all).toBe(1)

    repo.delete(todo.id)

    expect(repo.counts()).toEqual({ all: 0, active: 0, completed: 0 })
  })
})
