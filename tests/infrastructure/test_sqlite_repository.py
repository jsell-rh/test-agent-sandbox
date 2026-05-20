"""Tests for SqliteTodoRepository.

Each test class receives a fresh in-memory SQLite database via the `repo`
fixture — no shared state between tests.  Todos are seeded via repository
`save()` calls as required by the spec's test-isolation rule.
"""

from __future__ import annotations

import time

import pytest

from todo.domain.todo import Todo
from todo.domain.value_objects import (
    FilterCriteria,
    Timestamp,
    TodoId,
    TodoStatus,
    TodoTitle,
)
from todo.infrastructure.errors import DatabaseInitError, PersistenceError
from todo.infrastructure.sqlite_repository import SqliteTodoRepository


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def repo() -> SqliteTodoRepository:
    """Fresh in-memory SqliteTodoRepository for each test."""
    return SqliteTodoRepository(database_path=":memory:")


def _make_todo(title: str = "Buy milk") -> Todo:
    """Create a domain Todo using the public factory method."""
    return Todo.create(TodoTitle(title))


# ---------------------------------------------------------------------------
# Schema migrations
# ---------------------------------------------------------------------------


class TestSchemaMigrations:
    """Migration application and idempotency."""

    def test_fresh_database_has_todos_table(self, repo: SqliteTodoRepository) -> None:
        # Saving and reading back validates the schema exists.
        todo = _make_todo()
        repo.save(todo)
        assert repo.find_by_id(todo.id) is not None

    def test_fresh_database_has_schema_migrations_table(
        self, repo: SqliteTodoRepository
    ) -> None:
        row = repo._connection.execute(
            "SELECT COUNT(*) FROM schema_migrations;"
        ).fetchone()
        assert row[0] >= 1  # migration 001 is recorded

    def test_applying_migrations_twice_is_idempotent(self) -> None:
        repo = SqliteTodoRepository(database_path=":memory:")
        # Calling _apply_migrations a second time must not raise.
        repo._apply_migrations()
        # Verify the schema is still intact.
        todo = _make_todo()
        repo.save(todo)
        assert repo.find_by_id(todo.id) is not None


# ---------------------------------------------------------------------------
# findById
# ---------------------------------------------------------------------------


class TestFindById:
    """TodoRepository.find_by_id() contract."""

    def test_returns_fully_reconstituted_todo(self, repo: SqliteTodoRepository) -> None:
        todo = _make_todo("Walk the dog")
        repo.save(todo)

        found = repo.find_by_id(todo.id)

        assert found is not None
        assert found.id == todo.id
        assert found.title == todo.title
        assert found.status is TodoStatus.ACTIVE
        assert found.created_at == todo.created_at
        assert found.updated_at == todo.updated_at

    def test_returns_none_for_unknown_id(self, repo: SqliteTodoRepository) -> None:
        unknown_id = TodoId.generate()
        assert repo.find_by_id(unknown_id) is None

    def test_reconstituted_todo_emits_no_domain_events(
        self, repo: SqliteTodoRepository
    ) -> None:
        todo = _make_todo()
        repo.save(todo)
        todo.pull_events()  # drain the create event from the original

        found = repo.find_by_id(todo.id)
        assert found is not None
        assert found.pull_events() == []


# ---------------------------------------------------------------------------
# findAll
# ---------------------------------------------------------------------------


class TestFindAll:
    """TodoRepository.find_all() contract."""

    def test_returns_empty_list_when_no_todos_exist(
        self, repo: SqliteTodoRepository
    ) -> None:
        assert repo.find_all() == []

    def test_returns_todos_ordered_by_created_at_descending(
        self, repo: SqliteTodoRepository
    ) -> None:
        first = _make_todo("First")
        time.sleep(0.01)
        second = _make_todo("Second")
        time.sleep(0.01)
        third = _make_todo("Third")

        repo.save(first)
        repo.save(second)
        repo.save(third)

        todos = repo.find_all()
        assert len(todos) == 3
        # Newest (third) comes first.
        assert todos[0].id == third.id
        assert todos[1].id == second.id
        assert todos[2].id == first.id

    def test_filter_all_returns_active_and_completed(
        self, repo: SqliteTodoRepository
    ) -> None:
        active_todo = _make_todo("Active task")
        completed_todo = _make_todo("Done task")
        completed_todo.pull_events()
        completed_todo.complete()

        repo.save(active_todo)
        repo.save(completed_todo)

        todos = repo.find_all(FilterCriteria.ALL)
        ids = {t.id for t in todos}
        assert active_todo.id in ids
        assert completed_todo.id in ids

    def test_filter_active_excludes_completed(
        self, repo: SqliteTodoRepository
    ) -> None:
        active_todo = _make_todo("Active task")
        completed_todo = _make_todo("Done task")
        completed_todo.pull_events()
        completed_todo.complete()

        repo.save(active_todo)
        repo.save(completed_todo)

        todos = repo.find_all(FilterCriteria.ACTIVE)
        assert len(todos) == 1
        assert todos[0].id == active_todo.id

    def test_filter_completed_excludes_active(
        self, repo: SqliteTodoRepository
    ) -> None:
        active_todo = _make_todo("Active task")
        completed_todo = _make_todo("Done task")
        completed_todo.pull_events()
        completed_todo.complete()

        repo.save(active_todo)
        repo.save(completed_todo)

        todos = repo.find_all(FilterCriteria.COMPLETED)
        assert len(todos) == 1
        assert todos[0].id == completed_todo.id

    def test_default_criteria_is_all(self, repo: SqliteTodoRepository) -> None:
        """find_all() with no argument behaves the same as find_all(FilterCriteria.ALL)."""
        active_todo = _make_todo("Active")
        completed_todo = _make_todo("Done")
        completed_todo.pull_events()
        completed_todo.complete()

        repo.save(active_todo)
        repo.save(completed_todo)

        assert len(repo.find_all()) == 2


# ---------------------------------------------------------------------------
# save (insert)
# ---------------------------------------------------------------------------


class TestSaveInsert:
    """TodoRepository.save() — first persistence (insert path)."""

    def test_saved_todo_can_be_retrieved_by_id(
        self, repo: SqliteTodoRepository
    ) -> None:
        todo = _make_todo()
        repo.save(todo)
        assert repo.find_by_id(todo.id) is not None

    def test_created_at_and_updated_at_are_identical_on_first_save(
        self, repo: SqliteTodoRepository
    ) -> None:
        todo = _make_todo()
        repo.save(todo)
        found = repo.find_by_id(todo.id)
        assert found is not None
        assert found.created_at == found.updated_at


# ---------------------------------------------------------------------------
# save (update / upsert)
# ---------------------------------------------------------------------------


class TestSaveUpdate:
    """TodoRepository.save() — update path (ON CONFLICT DO UPDATE)."""

    def test_updating_title_is_reflected_on_find_by_id(
        self, repo: SqliteTodoRepository
    ) -> None:
        todo = _make_todo("Original title")
        repo.save(todo)

        time.sleep(0.01)
        todo.update_title(TodoTitle("Updated title"))
        repo.save(todo)

        found = repo.find_by_id(todo.id)
        assert found is not None
        assert found.title == TodoTitle("Updated title")

    def test_updating_status_is_reflected_on_find_by_id(
        self, repo: SqliteTodoRepository
    ) -> None:
        todo = _make_todo()
        repo.save(todo)

        todo.pull_events()
        time.sleep(0.01)
        todo.complete()
        repo.save(todo)

        found = repo.find_by_id(todo.id)
        assert found is not None
        assert found.status is TodoStatus.COMPLETED

    def test_created_at_is_unchanged_after_update(
        self, repo: SqliteTodoRepository
    ) -> None:
        todo = _make_todo()
        repo.save(todo)
        original_created_at = todo.created_at

        time.sleep(0.01)
        todo.pull_events()
        todo.complete()
        repo.save(todo)

        found = repo.find_by_id(todo.id)
        assert found is not None
        assert found.created_at == original_created_at

    def test_updated_at_is_later_than_created_at_after_update(
        self, repo: SqliteTodoRepository
    ) -> None:
        todo = _make_todo()
        repo.save(todo)

        time.sleep(0.01)
        todo.pull_events()
        todo.complete()
        repo.save(todo)

        found = repo.find_by_id(todo.id)
        assert found is not None
        assert found.updated_at.value > found.created_at.value


# ---------------------------------------------------------------------------
# delete
# ---------------------------------------------------------------------------


class TestDelete:
    """TodoRepository.delete() contract."""

    def test_deleted_todo_is_not_returned_by_find_by_id(
        self, repo: SqliteTodoRepository
    ) -> None:
        todo = _make_todo()
        repo.save(todo)
        repo.delete(todo.id)
        assert repo.find_by_id(todo.id) is None

    def test_deleted_todo_is_not_returned_by_find_all(
        self, repo: SqliteTodoRepository
    ) -> None:
        todo = _make_todo()
        repo.save(todo)
        repo.delete(todo.id)
        assert repo.find_all() == []

    def test_delete_on_non_existent_id_does_not_raise(
        self, repo: SqliteTodoRepository
    ) -> None:
        non_existent = TodoId.generate()
        repo.delete(non_existent)  # must not raise


# ---------------------------------------------------------------------------
# counts
# ---------------------------------------------------------------------------


class TestCounts:
    """TodoRepository.counts() contract."""

    def test_returns_zeros_on_empty_store(self, repo: SqliteTodoRepository) -> None:
        counts = repo.counts()
        assert counts == {"all": 0, "active": 0, "completed": 0}

    def test_counts_after_mixed_inserts(self, repo: SqliteTodoRepository) -> None:
        active1 = _make_todo("Active 1")
        active2 = _make_todo("Active 2")
        done = _make_todo("Done")
        done.pull_events()
        done.complete()

        repo.save(active1)
        repo.save(active2)
        repo.save(done)

        counts = repo.counts()
        assert counts["all"] == 3
        assert counts["active"] == 2
        assert counts["completed"] == 1

    def test_counts_reflect_status_after_update(
        self, repo: SqliteTodoRepository
    ) -> None:
        todo = _make_todo()
        repo.save(todo)

        todo.pull_events()
        todo.complete()
        repo.save(todo)

        counts = repo.counts()
        assert counts["active"] == 0
        assert counts["completed"] == 1
        assert counts["all"] == 1


# ---------------------------------------------------------------------------
# Failure modes
# ---------------------------------------------------------------------------


class TestFailureModes:
    """Error propagation from infrastructure layer."""

    def test_database_init_error_on_unwritable_path(self) -> None:
        with pytest.raises(DatabaseInitError):
            # A path into a non-existent directory triggers an OperationalError
            # immediately when SQLite tries to open/create the file.
            SqliteTodoRepository(database_path="/nonexistent/path/todos.db")

    def test_check_constraint_prevents_invalid_status_at_db_level(
        self, repo: SqliteTodoRepository
    ) -> None:
        """The CHECK constraint on status is a safety net in the schema itself."""
        import sqlite3

        with pytest.raises(sqlite3.IntegrityError):
            repo._connection.execute(
                "INSERT INTO todos (id, title, status, created_at, updated_at) "
                "VALUES ('x', 'T', 'invalid_status', "
                "'2026-01-01T00:00:00+00:00', '2026-01-01T00:00:00+00:00');"
            )

    def test_persistence_error_raised_when_save_fails(
        self, repo: SqliteTodoRepository
    ) -> None:
        """save() wraps database failures as PersistenceError."""
        # Close the connection to force any execute() to raise a database error.
        repo.close()
        todo = _make_todo()
        with pytest.raises(PersistenceError):
            repo.save(todo)
