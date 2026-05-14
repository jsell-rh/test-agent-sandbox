"""
SQLite implementation of TodoRepository.

Uses raw SQL only — no ORM. Connection management, WAL mode, busy timeout,
and versioned migrations are handled here.
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
# Configuration constants
# ---------------------------------------------------------------------------

DATABASE_PATH_ENV_VAR = "DATABASE_PATH"
DEFAULT_DATABASE_PATH = "./todos.db"
BUSY_TIMEOUT_MS = 5000

_MIGRATIONS_DIR = Path(__file__).parent / "migrations"

# ---------------------------------------------------------------------------
# SQL statements
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
    "SELECT id, title, status, created_at, updated_at FROM todos ORDER BY created_at DESC;"
)

_SQL_FIND_BY_STATUS = (
    "SELECT id, title, status, created_at, updated_at FROM todos "
    "WHERE status = ? ORDER BY created_at DESC;"
)

_SQL_UPSERT = """
INSERT INTO todos (id, title, status, created_at, updated_at)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
    title      = excluded.title,
    status     = excluded.status,
    updated_at = excluded.updated_at;
"""

_SQL_DELETE = "DELETE FROM todos WHERE id = ?;"

_SQL_COUNTS = """
SELECT
    COUNT(*)                                              AS all_count,
    SUM(CASE WHEN status = 'active'    THEN 1 ELSE 0 END) AS active_count,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_count
FROM todos;
"""


# ---------------------------------------------------------------------------
# Repository
# ---------------------------------------------------------------------------


class SqliteTodoRepository(TodoRepository):
    """
    SQLite-backed TodoRepository.

    Startup sequence:
      1. Open connection with WAL mode and busy timeout.
      2. Apply any unapplied versioned migrations (blocking).
      3. Ready to serve requests.

    The ``database_path`` parameter accepts:
      - A file path (e.g. ``./todos.db``).
      - ``":memory:"`` for an ephemeral in-memory database (used in tests).
    """

    def __init__(self, database_path: Optional[str] = None) -> None:
        resolved_path = self._resolve_database_path(database_path)
        try:
            self._connection = self._open_connection(resolved_path)
            self._apply_migrations()
        except sqlite3.Error as exc:
            raise DatabaseInitError(
                f"Failed to initialise database at {resolved_path!r}: {exc}"
            ) from exc

    # ------------------------------------------------------------------
    # Internal: connection management
    # ------------------------------------------------------------------

    @staticmethod
    def _resolve_database_path(explicit_path: Optional[str]) -> str:
        if explicit_path is not None:
            return explicit_path
        env_value = os.environ.get(DATABASE_PATH_ENV_VAR)
        if env_value is None:
            logger.warning(
                "%s environment variable is not set; falling back to %s",
                DATABASE_PATH_ENV_VAR,
                DEFAULT_DATABASE_PATH,
            )
            return DEFAULT_DATABASE_PATH
        return env_value

    @staticmethod
    def _open_connection(database_path: str) -> sqlite3.Connection:
        conn = sqlite3.connect(database_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute(f"PRAGMA journal_mode=WAL;")
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
        Create the schema_migrations tracking table if absent, then apply any
        migration files not yet recorded.  This is idempotent.
        """
        self._connection.executescript(_SQL_CREATE_MIGRATIONS_TABLE)

        applied: set[int] = {
            row[0]
            for row in self._connection.execute(_SQL_SELECT_APPLIED_VERSIONS)
        }

        for migration_file in sorted(_MIGRATIONS_DIR.glob("*.sql")):
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
        Execute a write statement and wrap any sqlite3.Error as PersistenceError.
        """
        try:
            self._connection.execute(sql, params)
            self._connection.commit()
        except sqlite3.Error as exc:
            raise PersistenceError(f"Database write failed: {exc}") from exc

    # ------------------------------------------------------------------
    # Internal: row -> domain mapping
    # ------------------------------------------------------------------

    @staticmethod
    def _row_to_todo(row: sqlite3.Row) -> Todo:
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
        row = self._connection.execute(_SQL_FIND_BY_ID, (id.value,)).fetchone()
        if row is None:
            return None
        return self._row_to_todo(row)

    def find_all(self, filter: FilterCriteria = FilterCriteria.ALL) -> list[Todo]:
        if filter is FilterCriteria.ALL:
            rows = self._connection.execute(_SQL_FIND_ALL).fetchall()
        else:
            rows = self._connection.execute(_SQL_FIND_BY_STATUS, (filter.value,)).fetchall()
        return [self._row_to_todo(row) for row in rows]

    def save(self, todo: Todo) -> None:
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
            raise PersistenceError(f"Failed to save todo {todo.id.value!r}: {exc}") from exc

    def delete(self, id: TodoId) -> None:
        try:
            self._connection.execute(_SQL_DELETE, (id.value,))
            self._connection.commit()
        except sqlite3.Error as exc:
            raise PersistenceError(f"Failed to delete todo {id.value!r}: {exc}") from exc

    def counts(self) -> dict[str, int]:
        row = self._connection.execute(_SQL_COUNTS).fetchone()
        return {
            "all": row["all_count"] or 0,
            "active": row["active_count"] or 0,
            "completed": row["completed_count"] or 0,
        }
