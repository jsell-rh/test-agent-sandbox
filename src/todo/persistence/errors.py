"""Persistence layer error types."""


class DatabaseInitError(Exception):
    """Raised when the database cannot be initialised.

    This covers both connection failures (e.g., file not writable) and
    migration failures that prevent the schema from being prepared before
    the application accepts requests.
    """


class PersistenceError(Exception):
    """Raised when a persistence operation fails at runtime.

    Typical cause: an SQLite constraint violation (e.g., CHECK on status,
    PRIMARY KEY conflict) propagated from a repository write.
    """
