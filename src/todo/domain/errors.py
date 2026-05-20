"""Domain errors for the Todo bounded context.

These errors are raised inside the domain (Aggregate, Value Objects) and
propagate outward to the Application Layer.  Infrastructure MUST NOT raise
these directly; it should translate its own exceptions into domain errors
where appropriate.
"""


class InvalidTitleError(ValueError):
    """Raised when a ``TodoTitle`` violates domain invariants.

    Triggers:
    - Title is blank or whitespace-only.
    - Title exceeds the maximum allowed length (``TITLE_MAX_LENGTH``).
    """


class TodoNotFoundError(KeyError):
    """Raised when a ``TodoId`` references a non-existent Todo.

    Typically raised by a ``TodoRepository`` implementation when
    ``find_by_id`` returns ``None`` and the caller requires the entity
    to exist.
    """
