"""Domain error types for the Todo bounded context."""


class InvalidTitleError(ValueError):
    """Raised when a ``TodoTitle`` is blank or exceeds the maximum length.

    Extends ``ValueError`` so callers can treat it as a standard value
    validation failure.
    """


class TodoNotFoundError(Exception):
    """Raised by the Application Layer when a ``TodoId`` does not exist.

    The Repository returns ``None`` on a miss; the Application Layer is
    responsible for converting that into this error.
    """
