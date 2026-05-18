"""
SQLite implementation of TodoRepository.

Uses raw SQL only — no ORM. Connection management, WAL mode, busy timeout,
and versioned migrations are handled here.

Spec: specs/persistence.spec.md
"""

from __future__ import annotations

import logging
import os
import sqlite3
from pathlib import Path
from typing import Optional

from todo.domain.repository import TodoRepository
from todo.domain.todo import Todo
from todo.domain.value_objects import (
    FilterCriteria,
    Timestamp,
    TodoId,
    TodoStatus,
    TodoTitle,
)
from todo.infrastructure.errors import DatabaseInitError, PersistenceError

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration constants — never hardcode these values inline.
# ---------------------------------------------------------------------------

DATABASE_PATH_ENV_VAR = "DATABASE_PATH"
DEFAULT_DATABASE_PATH = "./todos.db"

# WAL (Write-Ahead Logging) mode for durability.
JOURNAL_MODE = "WAL"

# Busy timeout in milliseconds: second writer waits rather than failing fast.
BUSY_TIMEOUT_MS = 5000

# Migration files are co-located with this module.
_MIGRATIONS_DIR = Path(__file__).parent / "migrations"

# ---------------------------------------------------------------------------
# SQL statements — kept as module-level constants (no magic strings inline).
# ---------------------------------------------------------------------------

_SQL_CREATE_MIGRATIONS_TABLE = """
CREATE TABLE IF NOT EXISTS schema_migrations (
    version    INTEGER NOT NULL PRIMARY KEY,
    applied_at TEXT    NOT NULL
);
"""

_SQL_SELECT_APPLIED_VERSIONS = "SELECT version FROM schema_migrations;"

_SQL_INSERT_MIGRATION_VERSION = (
    "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?);"
)

_SQL_FIND_BY_ID = (
    "SELECT id, title, status, created_at, updated_at FROM todos WHERE id = ?;"
)

_SQL_FIND_ALL = (
    "SELECT id, title, status, created_at, updated_at "
    "FROM todos ORDER BY created_at DESC;"
)

_SQL_FIND_BY_STATUS = (
    "SELECT id, title, status, created_at, updated_at "
    "FROM todos WHERE status = ? ORDER BY created_at DESC;"
)

# Upsert: insert or update — created_at is excluded from the DO UPDATE clause
# so it is never overwritten.
_SQL_UPSERT = """
INSERT INTO todos (id, title, status, created_at, updated_at)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
    title      = excluded.title,
    status     = excluded.status,
    updated_at = excluded.updated_at;
"""

_SQL_DELETE = "DELETE FROM todos WHERE id = ?;"

# Single-query counts — avoids a second round-trip.
_SQL_COUNTS = """
SELECT
    COUNT(*)                                              AS "all",
    SUM(CASE WHEN status = 'active'    THEN 1 ELSE 0 END) AS active,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
FROM todos;
"""


# ---------------------------------------------------------------------------
# Repository implementation
# ---------------------------------------------------------------------------


class SqliteTodoRepository(TodoRepository):
    """
    SQLite-backed TodoRepository.

    Startup sequence (blocking, before requests are accepted):
      1. Open connection with WAL mode and busy timeout.
      2. Apply any unapplied versioned migrations synchronously.
      3. Ready to serve requests.

    ``database_path`` accepts:
      - A file path (e.g. ``./todos.db``).
      - ``":memory:"`` for an ephemeral in-memory database (used in tests).
    """

    def __init__(self, database_path: Optional[str] = None) -> None:
        resolved_path = self._resolve_database_path(database_path)
        try:
            self._connection = self._open_connection(resolved_path)
            self._apply_migrations()
        except sqlite3.Error as exc:
            logger.error(
                "Database initialisation failed at %r: %s",
                resolved_path,
                exc,
                exc_info=True,
            )
            raise DatabaseInitError("Database initialisation failed") from exc

    # ------------------------------------------------------------------
    # Internal: connection management
    # ------------------------------------------------------------------

    @staticmethod
    def _resolve_database_path(explicit_path: Optional[str]) -> str:
        """
        Determine the database path in priority order:
          1. Explicit argument (e.g. ":memory:" in tests).
          2. DATABASE_PATH environment variable.
          3. DEFAULT_DATABASE_PATH with a warning log.
        """
        if explicit_path is not None:
            return explicit_path
        env_value = os.environ.get(DATABASE_PATH_ENV_VAR)
        if env_value is None:
            logger.warning(
                "%s environment variable is not set; falling back to %r",
                DATABASE_PATH_ENV_VAR,
                DEFAULT_DATABASE_PATH,
            )
            return DEFAULT_DATABASE_PATH
        return env_value

    @staticmethod
    def _open_connection(database_path: str) -> sqlite3.Connection:
        conn = sqlite3.connect(database_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        # Enable WAL mode for durability. In-memory databases silently
        # downgrade to "memory" journal mode, which is fine for tests.
        actual_mode = conn.execute(
            f"PRAGMA journal_mode={JOURNAL_MODE};"
        ).fetchone()[0]
        if actual_mode != JOURNAL_MODE.lower() and database_path != ":memory:":
            logger.warning(
                "Requested journal_mode=%r but got %r; "
                "WAL may not be supported on this filesystem",
                JOURNAL_MODE,
                actual_mode,
            )
        conn.execute(f"PRAGMA busy_timeout={BUSY_TIMEOUT_MS};")
        return conn

    def close(self) -> None:
        """Close the underlying database connection."""
        self._connection.close()

    # ------------------------------------------------------------------
    # Internal: migration runner
    # ------------------------------------------------------------------

    def _apply_migrations(self) -> None:
        """
        Ensure schema_migrations table exists, then apply any migration file
        whose version number is not already recorded. Idempotent.
        """
        self._connection.executescript(_SQL_CREATE_MIGRATIONS_TABLE)

        applied: set[int] = {
            row[0]
            for row in self._connection.execute(_SQL_SELECT_APPLIED_VERSIONS)
        }

        for migration_file in sorted(_MIGRATIONS_DIR.glob("*.sql")):
            # Parse version from filename prefix: "001_create_todos.sql" -> 1
            version = int(migration_file.name.split("_")[0])
            if version in applied:
                continue
            sql = migration_file.read_text()
            self._connection.executescript(sql)
            self._connection.execute(
                _SQL_INSERT_MIGRATION_VERSION,
                (version, Timestamp.now().value),
            )
            self._connection.commit()

    # ------------------------------------------------------------------
    # Internal: guarded write helper
    # ------------------------------------------------------------------

    def _execute_write(self, sql: str, params: tuple = ()) -> None:
        """
        Execute a write statement, wrapping any sqlite3.Error as PersistenceError.
        """
        try:
            self._connection.execute(sql, params)
            self._connection.commit()
        except sqlite3.Error as exc:
            logger.error("Database write failed: %s", exc, exc_info=True)
            raise PersistenceError("Database write failed") from exc

    # ------------------------------------------------------------------
    # Internal: row -> domain reconstitution
    # ------------------------------------------------------------------

    @staticmethod
    def _row_to_todo(row: sqlite3.Row) -> Todo:
        """Map a database row to a fully reconstituted Todo aggregate."""
        return Todo.reconstitute(
            id=TodoId.of(row["id"]),
            title=TodoTitle(row["title"]),
            status=TodoStatus(row["status"]),
            created_at=Timestamp(row["created_at"]),
            updated_at=Timestamp(row["updated_at"]),
        )

    # ------------------------------------------------------------------
    # TodoRepository implementation
    # ------------------------------------------------------------------

    def find_by_id(self, id: TodoId) -> Optional[Todo]:
        """Return the Todo with the given id, or None if not found."""
        row = self._connection.execute(_SQL_FIND_BY_ID, (id.value,)).fetchone()
        if row is None:
            return None
        return self._row_to_todo(row)

    def find_all(self, criteria: FilterCriteria = FilterCriteria.ALL) -> list[Todo]:
        """Return todos ordered by created_at descending, filtered by criteria."""
        if criteria == FilterCriteria.ALL:
            rows = self._connection.execute(_SQL_FIND_ALL).fetchall()
        else:
            rows = self._connection.execute(
                _SQL_FIND_BY_STATUS, (criteria.value,)
            ).fetchall()
        return [self._row_to_todo(row) for row in rows]

    def save(self, todo: Todo) -> None:
        """Upsert a Todo. created_at is never overwritten on update."""
        try:
            self._connection.execute(
                _SQL_UPSERT,
                (
                    todo.id.value,
                    todo.title.value,
                    todo.status.value,
                    todo.created_at.value,
                    todo.updated_at.value,
                ),
            )
            self._connection.commit()
        except sqlite3.Error as exc:
            logger.error(
                "Failed to save todo %r: %s", todo.id.value, exc, exc_info=True
            )
            raise PersistenceError("Failed to save todo") from exc

    def delete(self, id: TodoId) -> None:
        """Permanently remove a Todo. Silent no-op if the id does not exist."""
        try:
            self._connection.execute(_SQL_DELETE, (id.value,))
            self._connection.commit()
        except sqlite3.Error as exc:
            logger.error(
                "Failed to delete todo %r: %s", id.value, exc, exc_info=True
            )
            raise PersistenceError("Failed to delete todo") from exc

    def counts(self) -> dict[str, int]:
        """Return all/active/completed counts in a single query."""
        row = self._connection.execute(_SQL_COUNTS).fetchone()
        return {
            "all": row["all"] or 0,
            "active": row["active"] or 0,
            "completed": row["completed"] or 0,
        }
