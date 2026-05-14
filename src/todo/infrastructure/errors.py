"""Infrastructure-layer errors for persistence concerns."""

from __future__ import annotations


class DatabaseInitError(Exception):
    """
    Raised when the database cannot be initialised at startup.

    This is a hard failure — the application must not accept requests until
    the database is ready.
    """


class PersistenceError(Exception):
    """
    Raised when a repository operation fails unexpectedly.

    Wraps lower-level sqlite3 errors so callers need not depend on the
    database driver directly.
    """
