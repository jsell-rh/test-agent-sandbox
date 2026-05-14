"""
Tests for SqliteTodoRepository.

Spec: specs/persistence.spec.md

All tests use an in-memory SQLite database (seeded via repo.save()) for full
isolation. No mocks — every assertion validates real database round-trips.
"""

from __future__ import annotations

import time

import pytest

from todo.domain.errors import InvalidTitleError
from todo.domain.todo import Todo
from todo.domain.value_objects import FilterCriteria, Timestamp, TodoId, TodoStatus, TodoTitle
from todo.infrastructure.errors import DatabaseInitError, PersistenceError
from todo.infrastructure.sqlite_repository import SqliteTodoRepository

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_todo(title: str = "Buy groceries") -> Todo:
    """Create a Todo via the domain factory (status=active, fresh timestamps)."""
    return Todo.create(TodoTitle(title))


def make_completed_todo(title: str = "Done task") -> Todo:
    """Create a Todo and immediately complete it."""
    todo = make_todo(title)
    todo.pull_events()  # consume creation events
    todo.complete()
    todo.pull_events()  # consume completion event
    return todo


# ---------------------------------------------------------------------------
# findById
# ---------------------------------------------------------------------------


class TestFindById:
    def test_returns_fully_reconstituted_todo(self, repo: SqliteTodoRepository) -> None:
        """Saved todo can be fetched back with all fields intact."""
        original = make_todo("Buy milk")
        original.pull_events()
        repo.save(original)

        found = repo.find_by_id(original.id)

        assert found is not None
        assert found.id == original.id
        assert found.title == original.title
        assert found.status == original.status
        assert found.created_at == original.created_at
        assert found.updated_at == original.updated_at

    def test_returns_none_for_unknown_id(self, repo: SqliteTodoRepository) -> None:
        """Missing ids return None, not an exception."""
        result = repo.find_by_id(TodoId.of("00000000-0000-0000-0000-000000000000"))
        assert result is None

    def test_reconstituted_todo_has_no_domain_events(self, repo: SqliteTodoRepository) -> None:
        """Loading from storage must not re-emit TodoCreated or any other event."""
        todo = make_todo("No events please")
        todo.pull_events()
        repo.save(todo)

        reconstituted = repo.find_by_id(todo.id)

        assert reconstituted is not None
        assert reconstituted.pull_events() == []


# ---------------------------------------------------------------------------
# findAll
# ---------------------------------------------------------------------------


class TestFindAll:
    def test_returns_empty_list_when_store_is_empty(self, repo: SqliteTodoRepository) -> None:
        assert repo.find_all() == []

    def test_returns_todos_ordered_by_created_at_descending(
        self, repo: SqliteTodoRepository
    ) -> None:
        """Newest todo appears first in the list."""
        first = make_todo("First todo")
        first.pull_events()
        repo.save(first)

        # Small sleep to ensure distinct timestamps
        time.sleep(0.01)

        second = make_todo("Second todo")
        second.pull_events()
        repo.save(second)

        results = repo.find_all()

        assert len(results) == 2
        assert results[0].id == second.id
        assert results[1].id == first.id

    def test_filter_all_returns_both_active_and_completed(
        self, repo: SqliteTodoRepository
    ) -> None:
        active = make_todo("Active task")
        active.pull_events()
        repo.save(active)

        completed = make_completed_todo("Done task")
        repo.save(completed)

        results = repo.find_all(FilterCriteria.ALL)

        ids = {t.id for t in results}
        assert active.id in ids
        assert completed.id in ids

    def test_filter_active_excludes_completed(self, repo: SqliteTodoRepository) -> None:
        active = make_todo("Active")
        active.pull_events()
        repo.save(active)

        completed = make_completed_todo("Done")
        repo.save(completed)

        results = repo.find_all(FilterCriteria.ACTIVE)

        assert all(t.status == TodoStatus.ACTIVE for t in results)
        assert any(t.id == active.id for t in results)
        assert not any(t.id == completed.id for t in results)

    def test_filter_completed_excludes_active(self, repo: SqliteTodoRepository) -> None:
        active = make_todo("Active")
        active.pull_events()
        repo.save(active)

        completed = make_completed_todo("Done")
        repo.save(completed)

        results = repo.find_all(FilterCriteria.COMPLETED)

        assert all(t.status == TodoStatus.COMPLETED for t in results)
        assert any(t.id == completed.id for t in results)
        assert not any(t.id == active.id for t in results)

    def test_default_filter_is_all(self, repo: SqliteTodoRepository) -> None:
        """Calling find_all() with no argument returns all todos."""
        active = make_todo("Active")
        active.pull_events()
        repo.save(active)

        completed = make_completed_todo("Done")
        repo.save(completed)

        results = repo.find_all()
        assert len(results) == 2


# ---------------------------------------------------------------------------
# save (insert)
# ---------------------------------------------------------------------------


class TestSaveInsert:
    def test_persisted_todo_can_be_retrieved(self, repo: SqliteTodoRepository) -> None:
        todo = make_todo("Write tests")
        todo.pull_events()
        repo.save(todo)

        found = repo.find_by_id(todo.id)
        assert found is not None
        assert found.id == todo.id

    def test_created_at_and_updated_at_identical_on_first_save(
        self, repo: SqliteTodoRepository
    ) -> None:
        """On initial creation both timestamps are set to the same instant."""
        todo = make_todo("Fresh task")
        todo.pull_events()
        repo.save(todo)

        found = repo.find_by_id(todo.id)
        assert found is not None
        assert found.created_at == found.updated_at


# ---------------------------------------------------------------------------
# save (update)
# ---------------------------------------------------------------------------


class TestSaveUpdate:
    def test_updating_title_is_reflected_by_find_by_id(
        self, repo: SqliteTodoRepository
    ) -> None:
        todo = make_todo("Old title")
        todo.pull_events()
        repo.save(todo)

        todo.update_title(TodoTitle("New title"))
        todo.pull_events()
        repo.save(todo)

        found = repo.find_by_id(todo.id)
        assert found is not None
        assert found.title.value == "New title"

    def test_updating_status_is_reflected_by_find_by_id(
        self, repo: SqliteTodoRepository
    ) -> None:
        todo = make_todo("Active task")
        todo.pull_events()
        repo.save(todo)

        todo.complete()
        todo.pull_events()
        repo.save(todo)

        found = repo.find_by_id(todo.id)
        assert found is not None
        assert found.status == TodoStatus.COMPLETED

    def test_created_at_unchanged_after_update(self, repo: SqliteTodoRepository) -> None:
        """created_at must never be overwritten — only updated_at changes."""
        todo = make_todo("Stable created_at")
        todo.pull_events()
        repo.save(todo)
        original_created_at = todo.created_at

        todo.complete()
        todo.pull_events()
        repo.save(todo)

        found = repo.find_by_id(todo.id)
        assert found is not None
        assert found.created_at == original_created_at

    def test_updated_at_advances_after_mutation(self, repo: SqliteTodoRepository) -> None:
        """After a mutation, updated_at is strictly later than created_at."""
        todo = make_todo("Mutate me")
        todo.pull_events()
        repo.save(todo)

        # Allow time to advance before mutation
        time.sleep(0.01)

        todo.complete()
        todo.pull_events()
        repo.save(todo)

        found = repo.find_by_id(todo.id)
        assert found is not None
        assert found.updated_at.value > found.created_at.value


# ---------------------------------------------------------------------------
# delete
# ---------------------------------------------------------------------------


class TestDelete:
    def test_deleted_todo_not_returned_by_find_by_id(
        self, repo: SqliteTodoRepository
    ) -> None:
        todo = make_todo("To delete")
        todo.pull_events()
        repo.save(todo)

        repo.delete(todo.id)

        assert repo.find_by_id(todo.id) is None

    def test_deleted_todo_not_returned_by_find_all(
        self, repo: SqliteTodoRepository
    ) -> None:
        todo = make_todo("To delete")
        todo.pull_events()
        repo.save(todo)

        repo.delete(todo.id)

        assert all(t.id != todo.id for t in repo.find_all())

    def test_delete_non_existent_id_does_not_raise(
        self, repo: SqliteTodoRepository
    ) -> None:
        """Deleting a missing id is a silent no-op."""
        repo.delete(TodoId.of("00000000-0000-0000-0000-000000000000"))


# ---------------------------------------------------------------------------
# counts
# ---------------------------------------------------------------------------


class TestCounts:
    def test_returns_zero_counts_on_empty_store(self, repo: SqliteTodoRepository) -> None:
        result = repo.counts()
        assert result == {"all": 0, "active": 0, "completed": 0}

    def test_counts_after_mixed_inserts(self, repo: SqliteTodoRepository) -> None:
        active1 = make_todo("Active 1")
        active1.pull_events()
        repo.save(active1)

        active2 = make_todo("Active 2")
        active2.pull_events()
        repo.save(active2)

        completed = make_completed_todo("Done")
        repo.save(completed)

        result = repo.counts()
        assert result == {"all": 3, "active": 2, "completed": 1}

    def test_counts_reflect_status_changes(self, repo: SqliteTodoRepository) -> None:
        """Completing a todo moves it from active to completed in counts."""
        todo = make_todo("Will complete")
        todo.pull_events()
        repo.save(todo)

        assert repo.counts() == {"all": 1, "active": 1, "completed": 0}

        todo.complete()
        todo.pull_events()
        repo.save(todo)

        assert repo.counts() == {"all": 1, "active": 0, "completed": 1}


# ---------------------------------------------------------------------------
# Schema migrations
# ---------------------------------------------------------------------------


class TestMigrations:
    def test_fresh_database_has_valid_schema(self) -> None:
        """After migrations, the todos table with expected columns exists."""
        repo = SqliteTodoRepository(database_path=":memory:")
        try:
            # If this succeeds the schema is correct
            todo = make_todo("Schema check")
            todo.pull_events()
            repo.save(todo)
            found = repo.find_by_id(todo.id)
            assert found is not None
        finally:
            repo.close()

    def test_applying_migrations_twice_is_idempotent(self) -> None:
        """
        Re-running the migration runner on an already-migrated database
        must not raise errors or produce duplicate tables.
        """
        repo = SqliteTodoRepository(database_path=":memory:")
        try:
            repo._apply_migrations()  # second application
            # Basic smoke test — the repo still works
            todo = make_todo("Idempotent")
            todo.pull_events()
            repo.save(todo)
            assert repo.find_by_id(todo.id) is not None
        finally:
            repo.close()

    def test_schema_migrations_table_tracks_applied_versions(self) -> None:
        """Version 1 is recorded in schema_migrations after init."""
        repo = SqliteTodoRepository(database_path=":memory:")
        try:
            row = repo._connection.execute(
                "SELECT version FROM schema_migrations WHERE version = 1;"
            ).fetchone()
            assert row is not None
        finally:
            repo.close()


# ---------------------------------------------------------------------------
# Failure modes
# ---------------------------------------------------------------------------


class TestFailureModes:
    def test_database_init_error_on_unwritable_path(self) -> None:
        """An unwritable path raises DatabaseInitError, not a raw sqlite3 error."""
        with pytest.raises(DatabaseInitError):
            SqliteTodoRepository(database_path="/nonexistent/path/todos.db")

    def test_persistence_error_on_invalid_status_value(
        self, repo: SqliteTodoRepository
    ) -> None:
        """
        Inserting a row with an invalid status bypasses the domain but hits the
        SQLite CHECK constraint.  The repository wraps it as PersistenceError.
        """
        with pytest.raises(PersistenceError):
            repo._execute_write(
                "INSERT INTO todos (id, title, status, created_at, updated_at) "
                "VALUES (?, ?, ?, ?, ?);",
                (
                    "bad-id",
                    "title",
                    "INVALID_STATUS",
                    "2024-01-01T00:00:00+00:00",
                    "2024-01-01T00:00:00+00:00",
                ),
            )

    def test_database_path_env_var_missing_falls_back_to_default(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path
    ) -> None:
        """When DATABASE_PATH is unset, the repo uses DEFAULT_DATABASE_PATH."""
        import todo.infrastructure.sqlite_repository as repo_module

        monkeypatch.delenv("DATABASE_PATH", raising=False)
        db_path = tmp_path / "todos.db"
        monkeypatch.setattr(repo_module, "DEFAULT_DATABASE_PATH", str(db_path))

        repo = SqliteTodoRepository()
        try:
            assert db_path.exists(), "Expected DB file to be created at DEFAULT_DATABASE_PATH"
        finally:
            repo.close()

    def test_save_wraps_database_error_as_persistence_error(
        self, repo: SqliteTodoRepository
    ) -> None:
        """save() converts sqlite3.Error to PersistenceError (not a raw driver error)."""
        todo = make_todo("Will fail on save")
        todo.pull_events()

        # Drop the table to force a DB error on the next write
        repo._connection.execute("DROP TABLE todos;")
        repo._connection.commit()

        with pytest.raises(PersistenceError):
            repo.save(todo)
