"""FastAPI dependency providers for the Todo API.

Each dependency function is a generator that yields a resource and handles
cleanup.  Tests override ``get_repository`` via ``app.dependency_overrides``
to inject an in-memory repository.
"""

from __future__ import annotations

from collections.abc import Generator

from todo.domain.repository import TodoRepository
from todo.persistence.connection import open_connection
from todo.persistence.migrations.runner import run_migrations
from todo.persistence.repository import SQLiteTodoRepository


def get_repository() -> Generator[TodoRepository, None, None]:
    """Open a SQLite connection, run migrations, and yield a repository.

    Resolution of the database path follows the order defined in
    :func:`todo.persistence.connection.open_connection`:

    1. ``DATABASE_PATH`` environment variable.
    2. ``./todos.db`` (fallback).

    The connection is closed after the request completes, whether or not
    an exception was raised.
    """
    conn = open_connection()
    run_migrations(conn)
    try:
        yield SQLiteTodoRepository(conn)
    finally:
        conn.close()
