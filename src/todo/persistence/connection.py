"""SQLite connection management.

Reads DATABASE_PATH from the environment (default: ``./todos.db``).
Every connection is configured with WAL journal mode and a 5-second busy
timeout before being returned to the caller.
"""

from __future__ import annotations

import logging
import os
import sqlite3

from todo.persistence.errors import DatabaseInitError

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Public constants – consumed by tests and the migration runner so that no
# magic strings are scattered across the codebase.
# ---------------------------------------------------------------------------

#: Environment variable that specifies the SQLite database file path.
DATABASE_PATH_ENV_VAR: str = "DATABASE_PATH"

#: Default path used when DATABASE_PATH is absent from the environment.
DEFAULT_DATABASE_PATH: str = "./todos.db"

# ---------------------------------------------------------------------------
# Internal PRAGMA values – derived from the spec; defined here as named
# constants rather than inline literals.
# ---------------------------------------------------------------------------

_JOURNAL_MODE: str = "WAL"
_BUSY_TIMEOUT_MS: int = 5_000


def open_connection(database_path: str | None = None) -> sqlite3.Connection:
    """Open and configure a SQLite connection.

    Resolution order for *database_path*:

    1. The *database_path* argument (if provided).
    2. The ``DATABASE_PATH`` environment variable.
    3. ``./todos.db`` (fallback; logs a warning when used).

    The connection is configured before being returned:

    * ``PRAGMA journal_mode=WAL`` — Write-Ahead Logging for durability.
    * ``PRAGMA busy_timeout=5000`` — Wait up to 5 s on a locked database.
    * ``row_factory = sqlite3.Row`` — Named column access on query results.

    Args:
        database_path: Explicit path to the SQLite file, or ``":memory:"``
            for an in-memory database (used in tests).

    Returns:
        An open, configured :class:`sqlite3.Connection`.

    Raises:
        DatabaseInitError: If the database file cannot be opened or written
            to (e.g., path does not exist, file is read-only).
    """
    resolved_path = _resolve_path(database_path)

    conn: sqlite3.Connection | None = None
    try:
        conn = sqlite3.connect(resolved_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute(f"PRAGMA journal_mode={_JOURNAL_MODE};")
        conn.execute(f"PRAGMA busy_timeout={_BUSY_TIMEOUT_MS};")
        return conn
    except sqlite3.OperationalError as exc:
        if conn is not None:
            try:
                conn.close()
            except Exception:
                pass
        raise DatabaseInitError(
            f"Failed to initialize database at {resolved_path!r}: {exc}"
        ) from exc


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _resolve_path(explicit: str | None) -> str:
    """Return the database path to use, applying the resolution order."""
    if explicit is not None:
        return explicit

    from_env = os.environ.get(DATABASE_PATH_ENV_VAR)
    if from_env is not None:
        return from_env

    logger.warning(
        "%s environment variable is not set; defaulting to %r",
        DATABASE_PATH_ENV_VAR,
        DEFAULT_DATABASE_PATH,
    )
    return DEFAULT_DATABASE_PATH
