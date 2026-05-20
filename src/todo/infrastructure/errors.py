"""Infrastructure-layer errors for the Todo persistence context.

These errors are distinct from Domain errors: they represent failures in the
storage layer, not violations of business rules.
"""

from __future__ import annotations


class DatabaseInitError(Exception):
    """Raised when the database cannot be opened or migrations cannot be applied.

    The application must not accept requests until this is resolved.
    """


class PersistenceError(Exception):
    """Raised when a repository operation fails due to a database constraint or
    operational error (e.g. a CHECK constraint violation propagated from SQLite).
    """
