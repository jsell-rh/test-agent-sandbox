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
    - Title exceeds the maximum allowed length.
    """


class TodoNotFoundError(KeyError):
    """Raised when a ``TodoId`` references a non-existent Todo.

    Typically raised by a ``TodoRepository`` implementation when ``findById``
    returns ``None`` and the caller requires the entity to exist.
    """
