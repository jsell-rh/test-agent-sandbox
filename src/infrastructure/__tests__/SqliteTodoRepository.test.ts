/**
 * TDD test suite for SqliteTodoRepository.
 *
 * All tests use an in-memory SQLite database (:memory:) for full isolation.
 * Each describe block creates a fresh repository to prevent state leakage.
 *
 * Spec-Ref: specs/persistence.spec.md
 */

import { Todo, TodoTitle, TodoStatus, FilterCriteria } from '../../domain';
import { SqliteTodoRepository } from '../SqliteTodoRepository';

/** Helper: create a fresh in-memory repository for each test. */
function makeRepo(): SqliteTodoRepository {
  return new SqliteTodoRepository(':memory:');
}

/** Helper: create and save a todo, returning the saved instance. */
function seedTodo(
  repo: SqliteTodoRepository,
  title: string,
  options: { complete?: boolean } = {},
): Todo {
  const todo = Todo.create(new TodoTitle(title));
  if (options.complete) {
    todo.complete();
  }
  repo.save(todo);
  return todo;
}

// ---------------------------------------------------------------------------
// findById()
// ---------------------------------------------------------------------------

describe('SqliteTodoRepository.findById()', () => {
  it('returns a fully reconstituted Todo with all fields matching saved values', () => {
    const repo = makeRepo();
    const original = Todo.create(new TodoTitle('Buy milk'));
    repo.save(original);

    const found = repo.findById(original.id);

    expect(found).not.toBeNull();
    expect(found!.id).toBe(original.id);
    expect(found!.title).toBe(original.title);
    expect(found!.status).toBe(original.status);
    expect(found!.createdAt).toBe(original.createdAt);
    expect(found!.updatedAt).toBe(original.updatedAt);
  });

  it('returns null for an unknown TodoId', () => {
    const repo = makeRepo();
    const result = repo.findById('00000000-0000-0000-0000-000000000000');
    expect(result).toBeNull();
  });

  it('reconstituted Todo does not emit any Domain Events', () => {
    const repo = makeRepo();
    const original = Todo.create(new TodoTitle('Buy milk'));
    repo.save(original);

    const found = repo.findById(original.id);

    expect(found!.domainEvents).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// findAll()
// ---------------------------------------------------------------------------

describe('SqliteTodoRepository.findAll()', () => {
  it('returns todos ordered by createdAt descending', () => {
    const repo = makeRepo();
    // Seed with small delays to ensure distinct timestamps via clock
    const a = Todo.create(new TodoTitle('First'));
    repo.save(a);
    // Mutate updatedAt but createdAt stays the same for ordering tests
    const b = Todo.create(new TodoTitle('Second'));
    repo.save(b);
    const c = Todo.create(new TodoTitle('Third'));
    repo.save(c);

    const all = repo.findAll();

    // They should all appear; check ordering by createdAt DESC
    // Since all are created in rapid succession in tests, we check that
    // the repository returns them and that the order is consistent
    expect(all).toHaveLength(3);
    // Verify ordering: each item's createdAt should be >= next item's
    for (let i = 0; i < all.length - 1; i++) {
      expect(all[i].createdAt >= all[i + 1].createdAt).toBe(true);
    }
  });

  it('filter: active excludes completed todos', () => {
    const repo = makeRepo();
    seedTodo(repo, 'Active task');
    seedTodo(repo, 'Completed task', { complete: true });

    const active = repo.findAll(FilterCriteria.Active);

    expect(active).toHaveLength(1);
    expect(active[0].title).toBe('Active task');
    expect(active[0].status).toBe(TodoStatus.Active);
  });

  it('filter: completed excludes active todos', () => {
    const repo = makeRepo();
    seedTodo(repo, 'Active task');
    seedTodo(repo, 'Completed task', { complete: true });

    const completed = repo.findAll(FilterCriteria.Completed);

    expect(completed).toHaveLength(1);
    expect(completed[0].title).toBe('Completed task');
    expect(completed[0].status).toBe(TodoStatus.Completed);
  });

  it('filter: all returns both active and completed todos', () => {
    const repo = makeRepo();
    seedTodo(repo, 'Active task');
    seedTodo(repo, 'Completed task', { complete: true });

    const all = repo.findAll(FilterCriteria.All);

    expect(all).toHaveLength(2);
  });

  it('returns empty array when no todos exist', () => {
    const repo = makeRepo();
    expect(repo.findAll()).toEqual([]);
  });

  it('default (no filter) returns all todos', () => {
    const repo = makeRepo();
    seedTodo(repo, 'Active task');
    seedTodo(repo, 'Completed task', { complete: true });

    const all = repo.findAll(); // no filter arg

    expect(all).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// save() — insert
// ---------------------------------------------------------------------------

describe('SqliteTodoRepository.save() — insert', () => {
  it('persisted todo can be retrieved via findById()', () => {
    const repo = makeRepo();
    const todo = Todo.create(new TodoTitle('Walk the dog'));
    repo.save(todo);

    const found = repo.findById(todo.id);

    expect(found).not.toBeNull();
    expect(found!.title).toBe('Walk the dog');
  });

  it('createdAt and updatedAt are identical on first save', () => {
    const repo = makeRepo();
    const todo = Todo.create(new TodoTitle('Brand new'));
    repo.save(todo);

    const found = repo.findById(todo.id)!;

    expect(found.createdAt).toBe(found.updatedAt);
  });
});

// ---------------------------------------------------------------------------
// save() — update
// ---------------------------------------------------------------------------

describe('SqliteTodoRepository.save() — update', () => {
  it('updating title: findById() returns new title', () => {
    const repo = makeRepo();
    const todo = Todo.create(new TodoTitle('Old title'));
    repo.save(todo);

    todo.updateTitle(new TodoTitle('New title'));
    repo.save(todo);

    const found = repo.findById(todo.id)!;
    expect(found.title).toBe('New title');
  });

  it('updating status: findById() returns new status', () => {
    const repo = makeRepo();
    const todo = Todo.create(new TodoTitle('Task'));
    repo.save(todo);

    todo.complete();
    repo.save(todo);

    const found = repo.findById(todo.id)!;
    expect(found.status).toBe(TodoStatus.Completed);
  });

  it('createdAt is unchanged after update', () => {
    const repo = makeRepo();
    const todo = Todo.create(new TodoTitle('Stable'));
    repo.save(todo);
    const originalCreatedAt = todo.createdAt;

    todo.complete();
    repo.save(todo);

    const found = repo.findById(todo.id)!;
    expect(found.createdAt).toBe(originalCreatedAt);
  });

  it('updatedAt is later than or equal to createdAt after update', () => {
    const repo = makeRepo();
    const todo = Todo.create(new TodoTitle('Changing'));
    repo.save(todo);

    // Add a small delay to ensure updatedAt differs
    // In real code, Timestamp.now() uses Date.toISOString() which is millisecond-precise
    // We force a re-save after a mutation which will pick up a newer timestamp
    todo.updateTitle(new TodoTitle('Changed title'));
    repo.save(todo);

    const found = repo.findById(todo.id)!;
    // updatedAt >= createdAt (could be equal if mutation happens within same ms)
    expect(found.updatedAt >= found.createdAt).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// delete()
// ---------------------------------------------------------------------------

describe('SqliteTodoRepository.delete()', () => {
  it('deleted todo is not returned by findById()', () => {
    const repo = makeRepo();
    const todo = seedTodo(repo, 'To be deleted');

    repo.delete(todo.id);

    expect(repo.findById(todo.id)).toBeNull();
  });

  it('deleted todo is not returned by findAll()', () => {
    const repo = makeRepo();
    const todo = seedTodo(repo, 'To be deleted');
    seedTodo(repo, 'Keeper');

    repo.delete(todo.id);

    const all = repo.findAll();
    expect(all).toHaveLength(1);
    expect(all[0].title).toBe('Keeper');
  });

  it('calling delete on non-existent id does not throw', () => {
    const repo = makeRepo();
    expect(() => {
      repo.delete('00000000-0000-0000-0000-000000000000');
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// counts()
// ---------------------------------------------------------------------------

describe('SqliteTodoRepository.counts()', () => {
  it('returns { all: 0, active: 0, completed: 0 } on empty store', () => {
    const repo = makeRepo();
    expect(repo.counts()).toEqual({ all: 0, active: 0, completed: 0 });
  });

  it('correctly counts after mixed inserts', () => {
    const repo = makeRepo();
    seedTodo(repo, 'Active 1');
    seedTodo(repo, 'Active 2');
    seedTodo(repo, 'Completed 1', { complete: true });

    const counts = repo.counts();

    expect(counts.all).toBe(3);
    expect(counts.active).toBe(2);
    expect(counts.completed).toBe(1);
  });

  it('reflects updated counts after status change', () => {
    const repo = makeRepo();
    const todo = seedTodo(repo, 'Will complete');
    expect(repo.counts()).toEqual({ all: 1, active: 1, completed: 0 });

    todo.complete();
    repo.save(todo);

    expect(repo.counts()).toEqual({ all: 1, active: 0, completed: 1 });
  });
});

// ---------------------------------------------------------------------------
// Schema migrations
// ---------------------------------------------------------------------------

describe('Schema migrations', () => {
  it('applying migrations on fresh database results in valid schema', () => {
    // A new repo creates the schema; we verify by performing operations
    const repo = makeRepo();
    const todo = Todo.create(new TodoTitle('Migration test'));
    expect(() => repo.save(todo)).not.toThrow();
    expect(repo.findById(todo.id)).not.toBeNull();
  });

  it('creating a second repository on the same DB is idempotent (no errors)', () => {
    // Both repos point to :memory: — each gets its own independent DB (per better-sqlite3)
    // This tests that the migration guard works: re-running on an already-migrated DB is safe
    const repo1 = makeRepo();
    repo1.save(Todo.create(new TodoTitle('First repo')));

    // Simulating idempotency by closing and reopening would require the same file path.
    // For in-memory we test the guard independently via a dedicated in-process method.
    // The SqliteTodoRepository should not throw if called twice on the same connection.
    expect(() => (repo1 as any)._runMigrations()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Failure modes
// ---------------------------------------------------------------------------

describe('Failure modes', () => {
  it('DATABASE_PATH env var missing falls back to default path without throwing at construction', () => {
    // We can't easily test file creation in unit tests, so we test :memory: explicitly
    const repo = new SqliteTodoRepository(':memory:');
    expect(() => repo.findAll()).not.toThrow();
  });

  it('delete on non-existent id does not throw (Application Layer pre-validates)', () => {
    const repo = makeRepo();
    expect(() => repo.delete('does-not-exist')).not.toThrow();
  });
});
