"""Tests for the versioned migration runner.

Verifies observable behaviour of run_migrations():
- Fresh database receives the correct schema (tables + indexes).
- Running migrations twice is idempotent (no errors, no duplicates).
- Applied version is recorded in schema_migrations.
- todos table enforces the status CHECK constraint.
- Schema structure matches the spec exactly.
"""

from __future__ import annotations

import sqlite3

import pytest

from todo.persistence.connection import open_connection
from todo.persistence.migrations.runner import run_migrations


# ---------------------------------------------------------------------------
# Fixture
# ---------------------------------------------------------------------------


@pytest.fixture()
def fresh_db() -> sqlite3.Connection:
    """In-memory database with migrations applied."""
    conn = open_connection(":memory:")
    run_migrations(conn)
    yield conn
    conn.close()


# ---------------------------------------------------------------------------
# Schema creation — fresh database
# ---------------------------------------------------------------------------


class TestFreshDatabaseSchema:
    def test_creates_todos_table(self, fresh_db: sqlite3.Connection) -> None:
        row = fresh_db.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='todos';"
        ).fetchone()
        assert row is not None, "todos table should exist"

    def test_creates_schema_migrations_table(self, fresh_db: sqlite3.Connection) -> None:
        row = fresh_db.execute(
            "SELECT name FROM sqlite_master "
            "WHERE type='table' AND name='schema_migrations';"
        ).fetchone()
        assert row is not None, "schema_migrations table should exist"

    def test_creates_idx_todos_status_index(self, fresh_db: sqlite3.Connection) -> None:
        row = fresh_db.execute(
            "SELECT name FROM sqlite_master "
            "WHERE type='index' AND name='idx_todos_status';"
        ).fetchone()
        assert row is not None, "idx_todos_status index should exist"

    def test_creates_idx_todos_created_at_index(self, fresh_db: sqlite3.Connection) -> None:
        row = fresh_db.execute(
            "SELECT name FROM sqlite_master "
            "WHERE type='index' AND name='idx_todos_created_at';"
        ).fetchone()
        assert row is not None, "idx_todos_created_at index should exist"

    def test_todos_table_has_correct_columns(self, fresh_db: sqlite3.Connection) -> None:
        columns = {
            row[1]  # column name is index 1 in PRAGMA table_info
            for row in fresh_db.execute("PRAGMA table_info(todos);")
        }
        assert columns == {"id", "title", "status", "created_at", "updated_at"}

    def test_schema_migrations_table_has_correct_columns(
        self, fresh_db: sqlite3.Connection
    ) -> None:
        columns = {
            row[1] for row in fresh_db.execute("PRAGMA table_info(schema_migrations);")
        }
        assert columns == {"version", "applied_at"}


# ---------------------------------------------------------------------------
# Migration versioning
# ---------------------------------------------------------------------------


class TestMigrationVersionTracking:
    def test_initial_migration_version_is_recorded(
        self, fresh_db: sqlite3.Connection
    ) -> None:
        versions = [
            row[0] for row in fresh_db.execute("SELECT version FROM schema_migrations;")
        ]
        assert 1 in versions, "version 1 (001_create_todos.sql) should be recorded"

    def test_applied_at_is_iso8601_utc_timestamp(
        self, fresh_db: sqlite3.Connection
    ) -> None:
        applied_at = fresh_db.execute(
            "SELECT applied_at FROM schema_migrations WHERE version = 1;"
        ).fetchone()[0]
        # Basic sanity: non-empty string that looks like an ISO timestamp
        assert applied_at and "T" in applied_at


# ---------------------------------------------------------------------------
# Idempotency
# ---------------------------------------------------------------------------


class TestMigrationsIdempotent:
    def test_running_migrations_twice_does_not_raise(self) -> None:
        conn = open_connection(":memory:")
        run_migrations(conn)
        run_migrations(conn)  # second call must be a no-op
        conn.close()

    def test_running_migrations_twice_does_not_duplicate_version_rows(self) -> None:
        conn = open_connection(":memory:")
        run_migrations(conn)
        run_migrations(conn)
        count = conn.execute(
            "SELECT COUNT(*) FROM schema_migrations WHERE version = 1;"
        ).fetchone()[0]
        assert count == 1, "version should be recorded exactly once"
        conn.close()

    def test_todos_table_not_duplicated_after_second_run(self) -> None:
        conn = open_connection(":memory:")
        run_migrations(conn)
        run_migrations(conn)
        count = conn.execute(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='todos';"
        ).fetchone()[0]
        assert count == 1
        conn.close()


# ---------------------------------------------------------------------------
# Schema constraints
# ---------------------------------------------------------------------------


class TestTodosTableConstraints:
    _VALID_ROW = (
        "550e8400-e29b-41d4-a716-446655440000",
        "Buy milk",
        "active",
        "2024-01-01T00:00:00Z",
        "2024-01-01T00:00:00Z",
    )

    def test_valid_active_row_inserts_successfully(
        self, fresh_db: sqlite3.Connection
    ) -> None:
        fresh_db.execute(
            "INSERT INTO todos (id, title, status, created_at, updated_at)"
            " VALUES (?, ?, ?, ?, ?);",
            self._VALID_ROW,
        )
        fresh_db.commit()
        count = fresh_db.execute("SELECT COUNT(*) FROM todos;").fetchone()[0]
        assert count == 1

    def test_valid_completed_row_inserts_successfully(
        self, fresh_db: sqlite3.Connection
    ) -> None:
        row = self._VALID_ROW[:2] + ("completed",) + self._VALID_ROW[3:]
        fresh_db.execute(
            "INSERT INTO todos (id, title, status, created_at, updated_at)"
            " VALUES (?, ?, ?, ?, ?);",
            row,
        )
        fresh_db.commit()

    def test_status_check_rejects_invalid_value(
        self, fresh_db: sqlite3.Connection
    ) -> None:
        bad_row = self._VALID_ROW[:2] + ("pending",) + self._VALID_ROW[3:]
        with pytest.raises(sqlite3.IntegrityError):
            fresh_db.execute(
                "INSERT INTO todos (id, title, status, created_at, updated_at)"
                " VALUES (?, ?, ?, ?, ?);",
                bad_row,
            )
            fresh_db.commit()

    def test_id_is_primary_key(self, fresh_db: sqlite3.Connection) -> None:
        fresh_db.execute(
            "INSERT INTO todos (id, title, status, created_at, updated_at)"
            " VALUES (?, ?, ?, ?, ?);",
            self._VALID_ROW,
        )
        fresh_db.commit()
        with pytest.raises(sqlite3.IntegrityError):
            # Inserting the same id again should violate the PK.
            fresh_db.execute(
                "INSERT INTO todos (id, title, status, created_at, updated_at)"
                " VALUES (?, ?, ?, ?, ?);",
                self._VALID_ROW,
            )
            fresh_db.commit()

    def test_title_not_null_constraint(self, fresh_db: sqlite3.Connection) -> None:
        with pytest.raises(sqlite3.IntegrityError):
            fresh_db.execute(
                "INSERT INTO todos (id, title, status, created_at, updated_at)"
                " VALUES (?, NULL, 'active', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z');",
                ("some-id",),
            )
            fresh_db.commit()
