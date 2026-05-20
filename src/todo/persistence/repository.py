"""SQLite implementation of ``TodoRepository``.

Translates between the Domain's ``Todo`` Aggregate and the ``todos`` table.
Has zero knowledge of HTTP, UI, or Domain business rules.

All SQL is expressed as named module-level constants — no inline string
literals scattered through the methods.
"""

from __future__ import annotations

import sqlite3

from todo.domain.errors import TodoNotFoundError
from todo.domain.repository import TodoCounts
from todo.domain.todo import Todo
from todo.domain.value_objects import (
    FilterCriteria,
    Timestamp,
    TodoId,
    TodoStatus,
    TodoTitle,
)
from todo.persistence.errors import PersistenceError

# ---------------------------------------------------------------------------
# SQL constants — one place to maintain every query
# ---------------------------------------------------------------------------

_TABLE: str = "todos"

_SQL_FIND_BY_ID: str = f"SELECT * FROM {_TABLE} WHERE id = ?;"

_SQL_FIND_ALL: str = f"SELECT * FROM {_TABLE} ORDER BY created_at DESC;"

_SQL_FIND_BY_STATUS: str = (
    f"SELECT * FROM {_TABLE} WHERE status = ? ORDER BY created_at DESC;"
)

_SQL_UPSERT: str = f"""\
INSERT INTO {_TABLE} (id, title, status, created_at, updated_at)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
  title      = excluded.title,
  status     = excluded.status,
  updated_at = excluded.updated_at;"""

_SQL_EXISTS: str = f"SELECT 1 FROM {_TABLE} WHERE id = ? LIMIT 1;"

_SQL_DELETE: str = f"DELETE FROM {_TABLE} WHERE id = ?;"

_SQL_COUNTS: str = f"""\
SELECT
  COUNT(*)                                                              AS "all",
  SUM(CASE WHEN status = '{TodoStatus.ACTIVE.value}'    THEN 1 ELSE 0 END) AS active,
  SUM(CASE WHEN status = '{TodoStatus.COMPLETED.value}' THEN 1 ELSE 0 END) AS completed
FROM {_TABLE};"""


# ---------------------------------------------------------------------------
# Repository implementation
# ---------------------------------------------------------------------------


class SQLiteTodoRepository:
    """Concrete implementation of ``TodoRepository`` backed by SQLite.

    Args:
        conn: An open, configured :class:`sqlite3.Connection`.  The caller
            is responsible for lifecycle management (open / close).  Call
            :func:`todo.persistence.migrations.runner.run_migrations` on
            *conn* before constructing this repository.
    """

    def __init__(self, conn: sqlite3.Connection) -> None:
        self._conn = conn

    # ------------------------------------------------------------------
    # TodoRepository protocol
    # ------------------------------------------------------------------

    def find_by_id(self, id: TodoId) -> Todo | None:
        """Return the ``Todo`` with the given id, or ``None`` if not found.

        The reconstituted ``Todo`` has no pending domain events.
        """
        row = self._conn.execute(_SQL_FIND_BY_ID, (id.value,)).fetchone()
        if row is None:
            return None
        return _row_to_todo(row)

    def find_all(self, filter: FilterCriteria = FilterCriteria.ALL) -> list[Todo]:
        """Return todos matching *filter*, ordered by ``created_at`` descending.

        Args:
            filter: ``FilterCriteria.ALL`` (default) returns all todos.
                ``ACTIVE`` / ``COMPLETED`` restrict to that status.

        Returns:
            A (possibly empty) list of reconstituted ``Todo`` aggregates.
        """
        if filter is FilterCriteria.ALL:
            rows = self._conn.execute(_SQL_FIND_ALL).fetchall()
        else:
            rows = self._conn.execute(_SQL_FIND_BY_STATUS, (filter.value,)).fetchall()
        return [_row_to_todo(r) for r in rows]

    def save(self, todo: Todo) -> None:
        """Insert or update *todo* in the database.

        ``created_at`` is never overwritten on an update — see the UPSERT
        statement.  ``PersistenceError`` is raised if SQLite raises an
        integrity error (e.g., CHECK constraint violation on ``status``).
        """
        params = (
            todo.id.value,
            todo.title.value,
            todo.status.value,
            todo.created_at.value,
            todo.updated_at.value,
        )
        try:
            self._conn.execute(_SQL_UPSERT, params)
            self._conn.commit()
        except sqlite3.IntegrityError as exc:
            raise PersistenceError(
                f"Integrity constraint violated saving todo {todo.id.value!r}: {exc}"
            ) from exc

    def delete(self, id: TodoId) -> None:
        """Remove the todo identified by *id*.

        Raises:
            TodoNotFoundError: If no row with the given *id* exists in the
                database.  This enforces the spec failure mode: "Delete a
                non-existent TodoId → TodoNotFoundError thrown by Repository."
        """
        exists = self._conn.execute(_SQL_EXISTS, (id.value,)).fetchone()
        if exists is None:
            raise TodoNotFoundError(f"Todo not found: {id.value!r}")
        self._conn.execute(_SQL_DELETE, (id.value,))
        self._conn.commit()

    def counts(self) -> TodoCounts:
        """Return aggregate counts of all, active, and completed todos."""
        row = self._conn.execute(_SQL_COUNTS).fetchone()
        return TodoCounts(
            all=row["all"],
            active=row["active"] or 0,
            completed=row["completed"] or 0,
        )


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _row_to_todo(row: sqlite3.Row) -> Todo:
    """Reconstitute a ``Todo`` from a database row.

    Uses ``Todo.reconstitute()`` so that no domain events are emitted.
    ``TodoTitle`` re-validates the stored value; this acts as an additional
    integrity check on data already stored by the domain.
    """
    return Todo.reconstitute(
        id=TodoId(row["id"]),
        title=TodoTitle(row["title"]),
        status=TodoStatus(row["status"]),
        created_at=Timestamp(row["created_at"]),
        updated_at=Timestamp(row["updated_at"]),
    )
