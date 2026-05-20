"""Tests for the SQLite connection manager.

Verifies observable behaviour of open_connection():
- Returns a working sqlite3.Connection
- WAL mode (or equivalent) is configured
- busy_timeout is set to 5000 ms
- DATABASE_PATH env var is respected
- Falls back to DEFAULT_DATABASE_PATH when env var is absent
- Raises DatabaseInitError for unwritable / invalid paths
- row_factory enables named column access
"""

from __future__ import annotations

import logging
import sqlite3

import pytest

from todo.persistence.connection import (
    DATABASE_PATH_ENV_VAR,
    DEFAULT_DATABASE_PATH,
    open_connection,
)
from todo.persistence.errors import DatabaseInitError


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _in_memory() -> sqlite3.Connection:
    """Shorthand: open an in-memory database for a single test."""
    conn = open_connection(":memory:")
    return conn


# ---------------------------------------------------------------------------
# Basic connection smoke tests
# ---------------------------------------------------------------------------


class TestOpenConnectionBasic:
    def test_returns_sqlite_connection(self) -> None:
        conn = _in_memory()
        assert isinstance(conn, sqlite3.Connection)
        conn.close()

    def test_connection_is_usable(self) -> None:
        conn = _in_memory()
        conn.execute("CREATE TABLE t (x INTEGER);")
        conn.execute("INSERT INTO t VALUES (1);")
        row = conn.execute("SELECT x FROM t;").fetchone()
        assert row[0] == 1
        conn.close()

    def test_row_factory_enables_named_access(self) -> None:
        conn = _in_memory()
        conn.execute("CREATE TABLE t (answer INTEGER);")
        conn.execute("INSERT INTO t VALUES (42);")
        row = conn.execute("SELECT answer FROM t;").fetchone()
        # sqlite3.Row supports both index and name access
        assert row["answer"] == 42
        conn.close()


# ---------------------------------------------------------------------------
# PRAGMA verification
# ---------------------------------------------------------------------------


class TestConnectionPragmas:
    def test_journal_mode_is_wal_or_memory(self) -> None:
        """In-memory databases silently fall back to 'memory' mode.

        For a file database WAL would be 'wal'. Both are acceptable.
        """
        conn = _in_memory()
        mode = conn.execute("PRAGMA journal_mode;").fetchone()[0]
        assert mode in ("wal", "memory")
        conn.close()

    def test_wal_mode_set_on_file_database(self, tmp_path: pytest.TempPathFactory) -> None:
        db_path = str(tmp_path / "test.db")
        conn = open_connection(db_path)
        mode = conn.execute("PRAGMA journal_mode;").fetchone()[0]
        assert mode == "wal"
        conn.close()

    def test_busy_timeout_is_5000_ms(self) -> None:
        conn = _in_memory()
        timeout = conn.execute("PRAGMA busy_timeout;").fetchone()[0]
        assert timeout == 5_000
        conn.close()


# ---------------------------------------------------------------------------
# Path resolution
# ---------------------------------------------------------------------------


class TestPathResolution:
    def test_explicit_path_argument_overrides_everything(
        self, tmp_path: pytest.TempPathFactory, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        explicit = str(tmp_path / "explicit.db")
        # Even if env var is set, the explicit argument wins.
        monkeypatch.setenv(DATABASE_PATH_ENV_VAR, str(tmp_path / "env.db"))
        conn = open_connection(explicit)
        assert isinstance(conn, sqlite3.Connection)
        conn.close()

    def test_env_var_used_when_no_explicit_path(
        self, tmp_path: pytest.TempPathFactory, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        db_path = str(tmp_path / "from_env.db")
        monkeypatch.setenv(DATABASE_PATH_ENV_VAR, db_path)
        conn = open_connection()
        assert isinstance(conn, sqlite3.Connection)
        conn.close()

    def test_falls_back_to_default_path_when_env_var_absent(
        self, tmp_path: pytest.TempPathFactory, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.delenv(DATABASE_PATH_ENV_VAR, raising=False)
        # Redirect DEFAULT_DATABASE_PATH so we don't litter the CWD.
        import todo.persistence.connection as conn_module

        original = conn_module.DEFAULT_DATABASE_PATH
        conn_module.DEFAULT_DATABASE_PATH = str(tmp_path / "todos.db")
        try:
            conn = open_connection()
            assert isinstance(conn, sqlite3.Connection)
            conn.close()
        finally:
            conn_module.DEFAULT_DATABASE_PATH = original

    def test_logs_warning_when_env_var_absent(
        self,
        tmp_path: pytest.TempPathFactory,
        monkeypatch: pytest.MonkeyPatch,
        caplog: pytest.LogCaptureFixture,
    ) -> None:
        monkeypatch.delenv(DATABASE_PATH_ENV_VAR, raising=False)
        import todo.persistence.connection as conn_module

        original = conn_module.DEFAULT_DATABASE_PATH
        conn_module.DEFAULT_DATABASE_PATH = str(tmp_path / "todos.db")
        try:
            with caplog.at_level(logging.WARNING, logger="todo.persistence.connection"):
                conn = open_connection()
                conn.close()
            assert DATABASE_PATH_ENV_VAR in caplog.text
        finally:
            conn_module.DEFAULT_DATABASE_PATH = original


# ---------------------------------------------------------------------------
# Error conditions
# ---------------------------------------------------------------------------


class TestConnectionErrors:
    def test_raises_database_init_error_for_nonexistent_directory(self) -> None:
        with pytest.raises(DatabaseInitError, match="Failed to initialize"):
            open_connection("/nonexistent/directory/that/does/not/exist/db.sqlite")

    def test_raises_database_init_error_for_readonly_file(
        self, tmp_path: pytest.TempPathFactory
    ) -> None:
        db_path = tmp_path / "readonly.db"
        db_path.touch()
        db_path.chmod(0o444)  # read-only

        try:
            with pytest.raises(DatabaseInitError):
                open_connection(str(db_path))
        finally:
            # Restore permissions so tmp_path cleanup doesn't fail.
            db_path.chmod(0o644)

    def test_raises_database_init_error_message_contains_path(
        self, tmp_path: pytest.TempPathFactory
    ) -> None:
        db_path = tmp_path / "readonly.db"
        db_path.touch()
        db_path.chmod(0o444)

        try:
            with pytest.raises(DatabaseInitError) as exc_info:
                open_connection(str(db_path))
            assert str(db_path) in str(exc_info.value)
        finally:
            db_path.chmod(0o644)
