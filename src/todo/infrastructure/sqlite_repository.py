"""SQLite implementation of TodoRepository.

Connection management:
- Path configured via DATABASE_PATH env var (default: ./todos.db).
- For tests, set DATABASE_PATH=:memory: for an isolated in-memory database.
- WAL mode enabled at connection open.
- Busy timeout set to 5000 ms.
"""

from __future__ import annotations

import importlib.resources
import os
import sqlite3
from typing import Optional

from todo.domain.errors import TodoNotFoundError
from todo.domain.repository import TodoRepository
from todo.domain.todo import Todo
from todo.domain.value_objects import (
    FilterCriteria,
    Timestamp,
    TodoId,
    TodoStatus,
    TodoTitle,
)

# Environment variable name for the database path.
_DATABASE_PATH_ENV = "DATABASE_PATH"
_DATABASE_PATH_DEFAULT = "./todos.db"

# SQLite busy timeout in milliseconds.
_BUSY_TIMEOUT_MS = 5000

# Migrations package path (relative to this package).
_MIGRATIONS_PKG = "todo.infrastructure.migrations"


class SqliteTodoRepository(TodoRepository):
    """
    TodoRepository backed by a SQLite database.

    Args:
        db_path: Path to the SQLite file, or ':memory:' for in-memory.
                 Defaults to the value of the DATABASE_PATH env var,
                 or './todos.db' if that is unset.
    """

    def __init__(self, db_path: Optional[str] = None) -> None:
        if db_path is None:
            db_path = os.environ.get(_DATABASE_PATH_ENV, _DATABASE_PATH_DEFAULT)
        self._db_path = db_path
        self._conn = self._open_connection()
        self._apply_migrations()

    # ------------------------------------------------------------------
    # Connection lifecycle
    # ------------------------------------------------------------------

    def _open_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute(f"PRAGMA busy_timeout = {_BUSY_TIMEOUT_MS};")
        conn.execute("PRAGMA journal_mode = WAL;")
        return conn

    def close(self) -> None:
        """Close the underlying database connection."""
        self._conn.close()

    # ------------------------------------------------------------------
    # Schema migrations
    # ------------------------------------------------------------------

    def _apply_migrations(self) -> None:
        """Apply any unapplied versioned migrations."""
        self._conn.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version    INTEGER NOT NULL PRIMARY KEY,
                applied_at TEXT    NOT NULL
            );
            """
        )
        self._conn.commit()

        # Load and sort migration files from the package.
        migration_files = sorted(
            importlib.resources.files(_MIGRATIONS_PKG).iterdir()
        )
        for resource in migration_files:
            name = resource.name
            if not name.endswith(".sql"):
                continue
            version = int(name.split("_")[0])
            already_applied = self._conn.execute(
                "SELECT 1 FROM schema_migrations WHERE version = ?;", (version,)
            ).fetchone()
            if already_applied:
                continue
            sql = resource.read_text(encoding="utf-8")
            self._conn.executescript(sql)
            self._conn.execute(
                "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?);",
                (version, Timestamp.now().value),
            )
            self._conn.commit()

    # ------------------------------------------------------------------
    # TodoRepository implementation
    # ------------------------------------------------------------------

    def find_by_id(self, id: TodoId) -> Optional[Todo]:
        row = self._conn.execute(
            "SELECT * FROM todos WHERE id = ?;", (id.value,)
        ).fetchone()
        if row is None:
            return None
        return self._row_to_todo(row)

    def find_all(self, criteria: FilterCriteria = FilterCriteria.ALL) -> list[Todo]:
        if criteria is FilterCriteria.ALL:
            rows = self._conn.execute(
                "SELECT * FROM todos ORDER BY created_at DESC;"
            ).fetchall()
        else:
            rows = self._conn.execute(
                "SELECT * FROM todos WHERE status = ? ORDER BY created_at DESC;",
                (criteria.value,),
            ).fetchall()
        return [self._row_to_todo(row) for row in rows]

    def save(self, todo: Todo) -> None:
        self._conn.execute(
            """
            INSERT INTO todos (id, title, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                title      = excluded.title,
                status     = excluded.status,
                updated_at = excluded.updated_at;
            """,
            (
                todo.id.value,
                todo.title.value,
                todo.status.value,
                todo.created_at.value,
                todo.updated_at.value,
            ),
        )
        self._conn.commit()

    def delete(self, id: TodoId) -> None:
        self._conn.execute("DELETE FROM todos WHERE id = ?;", (id.value,))
        self._conn.commit()

    def counts(self) -> dict[str, int]:
        row = self._conn.execute(
            """
            SELECT
                COUNT(*)                                        AS all_count,
                SUM(CASE WHEN status = ? THEN 1 ELSE 0 END)    AS active_count,
                SUM(CASE WHEN status = ? THEN 1 ELSE 0 END)    AS completed_count
            FROM todos;
            """,
            (TodoStatus.ACTIVE.value, TodoStatus.COMPLETED.value),
        ).fetchone()
        return {
            "all":       int(row["all_count"] or 0),
            "active":    int(row["active_count"] or 0),
            "completed": int(row["completed_count"] or 0),
        }

    def delete_completed(self) -> int:
        """Delete all completed todos and return the count of deleted rows."""
        cursor = self._conn.execute(
            "DELETE FROM todos WHERE status = ?;",
            (TodoStatus.COMPLETED.value,),
        )
        self._conn.commit()
        return cursor.rowcount

    # ------------------------------------------------------------------
    # Mapping helpers
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
