"""SQLite implementation of the TodoRepository interface.

Connection management:
- DATABASE_PATH env var controls the file path (default: ./todos.db).
- WAL mode and busy_timeout are configured on every connection open.
- For tests, pass ':memory:' directly or set DATABASE_PATH=:memory:.

Migration strategy:
- Plain SQL files in the migrations/ directory, applied in order.
- Tracked via a schema_migrations table; unapplied migrations run at startup.
- Startup is synchronous and blocking: the repository is only usable after
  migrations succeed.

Separation rule: this module has zero knowledge of HTTP, UI, or Domain business
rules. It only maps data between Domain objects and SQLite rows.
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

# Configurable defaults — never hard-coded at call sites.
DEFAULT_DATABASE_PATH: str = "./todos.db"
BUSY_TIMEOUT_MS: int = 5000

_MIGRATIONS_DIR: Path = Path(__file__).parent / "migrations"


class SqliteTodoRepository(TodoRepository):
    """SQLite-backed implementation of TodoRepository.

    Thread safety: a single connection is used per instance.  Concurrent access
    from multiple threads requires one instance per thread, or an external lock.
    WAL mode allows concurrent reads even during a write.

    Args:
        database_path: Explicit path to the SQLite file (or ':memory:' for an
            in-memory database used in tests).  When omitted, the value of the
            DATABASE_PATH environment variable is used.  If that is also absent,
            falls back to DEFAULT_DATABASE_PATH and logs a warning.
    """

    def __init__(self, database_path: Optional[str] = None) -> None:
        resolved = self._resolve_database_path(database_path)
        self._database_path: str = resolved
        self._connection: sqlite3.Connection = self._open_connection()
        self._apply_migrations()

    # ------------------------------------------------------------------
    # Connection lifecycle
    # ------------------------------------------------------------------

    @staticmethod
    def _resolve_database_path(explicit: Optional[str]) -> str:
        """Return the database path to use, logging a warning when falling back."""
        if explicit is not None:
            return explicit
        from_env = os.environ.get("DATABASE_PATH")
        if from_env is not None:
            return from_env
        logger.warning(
            "DATABASE_PATH env var is not set; using default %r",
            DEFAULT_DATABASE_PATH,
        )
        return DEFAULT_DATABASE_PATH

    def _open_connection(self) -> sqlite3.Connection:
        """Open the SQLite connection and apply connection-level PRAGMAs."""
        try:
            conn = sqlite3.connect(self._database_path, check_same_thread=False)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA journal_mode=WAL;")
            conn.execute(f"PRAGMA busy_timeout={BUSY_TIMEOUT_MS};")
            return conn
        except sqlite3.OperationalError as exc:
            raise DatabaseInitError(
                f"Cannot open database at {self._database_path!r}: {exc}"
            ) from exc

    def close(self) -> None:
        """Close the underlying SQLite connection."""
        self._connection.close()

    # ------------------------------------------------------------------
    # Migration management
    # ------------------------------------------------------------------

    def _apply_migrations(self) -> None:
        """Ensure the schema_migrations table exists and apply any pending migrations.

        Raises:
            DatabaseInitError: if the migrations table cannot be created or a
                migration file cannot be executed.
        """
        try:
            self._connection.execute(
                """
                CREATE TABLE IF NOT EXISTS schema_migrations (
                  version     INTEGER NOT NULL PRIMARY KEY,
                  applied_at  TEXT    NOT NULL
                );
                """
            )
            self._connection.commit()
        except sqlite3.OperationalError as exc:
            raise DatabaseInitError(
                f"Cannot create schema_migrations table: {exc}"
            ) from exc

        migration_files = sorted(_MIGRATIONS_DIR.glob("*.sql"))
        for migration_file in migration_files:
            version = int(migration_file.stem.split("_")[0])
            already_applied = self._connection.execute(
                "SELECT 1 FROM schema_migrations WHERE version = ?;",
                (version,),
            ).fetchone()
            if already_applied:
                continue
            try:
                # executescript commits any pending transaction before running,
                # so migration SQL runs in autocommit mode.
                self._connection.executescript(migration_file.read_text())
                self._connection.execute(
                    "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?);",
                    (version, Timestamp.now().value),
                )
                self._connection.commit()
            except sqlite3.OperationalError as exc:
                raise DatabaseInitError(
                    f"Failed to apply migration {migration_file.name}: {exc}"
                ) from exc

    # ------------------------------------------------------------------
    # TodoRepository implementation
    # ------------------------------------------------------------------

    def find_by_id(self, id: TodoId) -> Optional[Todo]:
        """Return the Todo with the given id, or None if not found."""
        row = self._connection.execute(
            "SELECT * FROM todos WHERE id = ?;",
            (id.value,),
        ).fetchone()
        if row is None:
            return None
        return self._row_to_todo(row)

    def find_all(self, criteria: FilterCriteria = FilterCriteria.ALL) -> list[Todo]:
        """Return todos ordered by created_at descending, optionally filtered."""
        if criteria is FilterCriteria.ACTIVE:
            rows = self._connection.execute(
                "SELECT * FROM todos WHERE status = ? ORDER BY created_at DESC;",
                (TodoStatus.ACTIVE.value,),
            ).fetchall()
        elif criteria is FilterCriteria.COMPLETED:
            rows = self._connection.execute(
                "SELECT * FROM todos WHERE status = ? ORDER BY created_at DESC;",
                (TodoStatus.COMPLETED.value,),
            ).fetchall()
        else:
            rows = self._connection.execute(
                "SELECT * FROM todos ORDER BY created_at DESC;",
            ).fetchall()
        return [self._row_to_todo(row) for row in rows]

    def save(self, todo: Todo) -> None:
        """Persist a Todo (insert or update).  created_at is never overwritten."""
        try:
            self._connection.execute(
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
            self._connection.commit()
        except sqlite3.Error as exc:
            raise PersistenceError(
                f"Database error saving todo {todo.id.value!r}: {exc}"
            ) from exc

    def delete(self, id: TodoId) -> None:
        """Permanently remove a Todo.  Silently succeeds when id does not exist."""
        self._connection.execute(
            "DELETE FROM todos WHERE id = ?;",
            (id.value,),
        )
        self._connection.commit()

    def counts(self) -> dict[str, int]:
        """Return aggregate counts in a single query.

        Returns:
            A dict with keys 'all', 'active', 'completed'.
            SUM() returns NULL on an empty table; the ``or 0`` coerces to int.
        """
        # Use parameterized status values to stay consistent with TodoStatus enum;
        # avoids hard-coding string literals that must mirror the domain definition.
        row = self._connection.execute(
            """
            SELECT
              COUNT(*)                              AS all_count,
              SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS active_count,
              SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS completed_count
            FROM todos;
            """,
            (TodoStatus.ACTIVE.value, TodoStatus.COMPLETED.value),
        ).fetchone()
        return {
            "all": row["all_count"] or 0,
            "active": row["active_count"] or 0,
            "completed": row["completed_count"] or 0,
        }

    # ------------------------------------------------------------------
    # Mapping helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _row_to_todo(row: sqlite3.Row) -> Todo:
        """Reconstitute a Todo domain object from a database row.

        Uses Todo.reconstitute() to bypass domain event emission — loading from
        storage must never re-emit TodoCreated.
        """
        return Todo.reconstitute(
            id=TodoId.of(row["id"]),
            title=TodoTitle(row["title"]),
            status=TodoStatus(row["status"]),
            created_at=Timestamp(row["created_at"]),
            updated_at=Timestamp(row["updated_at"]),
        )
