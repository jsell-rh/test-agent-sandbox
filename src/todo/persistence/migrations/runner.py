"""Versioned SQL migration runner.

Migrations are plain ``.sql`` files stored in ``migrations/sql/``.  Each file
is prefixed with a zero-padded version number (e.g. ``001_create_todos.sql``).
Applied versions are tracked in a ``schema_migrations`` table so that
re-running the runner is idempotent.

On application start call :func:`run_migrations` with an open connection
*before* accepting any requests.  The function blocks until all pending
migrations have been applied.
"""

from __future__ import annotations

import sqlite3
from datetime import UTC, datetime
from pathlib import Path

from todo.persistence.errors import DatabaseInitError

# ---------------------------------------------------------------------------
# Internal constants
# ---------------------------------------------------------------------------

_MIGRATIONS_DIR: Path = Path(__file__).parent / "sql"

_SQL_CREATE_MIGRATIONS_TABLE: str = """\
CREATE TABLE IF NOT EXISTS schema_migrations (
  version    INTEGER NOT NULL PRIMARY KEY,
  applied_at TEXT    NOT NULL
);"""

_SQL_SELECT_APPLIED: str = "SELECT version FROM schema_migrations;"

_SQL_INSERT_MIGRATION: str = (
    "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?);"
)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def run_migrations(conn: sqlite3.Connection) -> None:
    """Apply every unapplied migration in version order.

    Steps performed:

    1. Create ``schema_migrations`` if it does not exist (idempotent DDL).
    2. Read the set of already-applied version numbers.
    3. Iterate over ``.sql`` files in ``migrations/sql/`` sorted by name.
    4. For each file whose version is *not* in the applied set, execute the
       SQL via :meth:`sqlite3.Connection.executescript` and record the
       version in ``schema_migrations``.

    This function is safe to call multiple times: already-applied migrations
    are skipped.

    Args:
        conn: An open SQLite connection, typically obtained from
            :func:`todo.persistence.connection.open_connection`.

    Raises:
        DatabaseInitError: If the migrations table cannot be created or if
            any migration script fails to execute.
    """
    _ensure_migrations_table(conn)
    applied = _applied_versions(conn)

    for migration_file in sorted(_MIGRATIONS_DIR.glob("*.sql")):
        version = _parse_version(migration_file.name)
        if version in applied:
            continue
        _apply_migration(conn, migration_file, version)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _ensure_migrations_table(conn: sqlite3.Connection) -> None:
    try:
        conn.execute(_SQL_CREATE_MIGRATIONS_TABLE)
        conn.commit()
    except sqlite3.OperationalError as exc:
        raise DatabaseInitError(
            f"Cannot create schema_migrations table: {exc}"
        ) from exc


def _applied_versions(conn: sqlite3.Connection) -> set[int]:
    return {row[0] for row in conn.execute(_SQL_SELECT_APPLIED)}


def _apply_migration(
    conn: sqlite3.Connection,
    migration_file: Path,
    version: int,
) -> None:
    """Execute one migration file and record its version."""
    sql = migration_file.read_text(encoding="utf-8")
    try:
        # executescript issues an implicit COMMIT before running the script.
        conn.executescript(sql)
        # Record the applied version (executescript ends autocommit mode).
        conn.execute(
            _SQL_INSERT_MIGRATION,
            (version, datetime.now(UTC).isoformat()),
        )
        conn.commit()
    except sqlite3.OperationalError as exc:
        raise DatabaseInitError(
            f"Failed to apply migration {migration_file.name!r}: {exc}"
        ) from exc


def _parse_version(filename: str) -> int:
    """Extract the numeric version from a filename like ``001_create_todos.sql``."""
    return int(filename.split("_")[0])
