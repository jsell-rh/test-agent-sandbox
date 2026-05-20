"""Value Objects for the Todo bounded context.

All value objects are immutable (``frozen=True`` dataclasses or Enums).
Equality is always by value, never by reference.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum

from todo.domain.errors import InvalidTitleError

# Domain invariant: maximum number of characters in a TodoTitle.
# Defined here as a module-level constant so it can be referenced from tests
# and imported by callers without duplicating the magic number.
TITLE_MAX_LENGTH: int = 500


@dataclass(frozen=True)
class TodoId:
    """Stable, globally-unique identifier for a Todo.

    Immutable after creation.  Equality is by value.
    """

    value: str

    def __post_init__(self) -> None:
        if not self.value:
            raise ValueError("TodoId value must not be empty")

    @classmethod
    def generate(cls) -> TodoId:
        """Return a fresh UUID v4-based ``TodoId``."""
        return cls(str(uuid.uuid4()))

    def __str__(self) -> str:
        return self.value


@dataclass(frozen=True)
class TodoTitle:
    """Human-readable description of the work to be done.

    Invariants enforced at construction time:
    - Must not be blank or whitespace-only.
    - Must not exceed ``TITLE_MAX_LENGTH`` characters (checked *after* trim).

    Leading/trailing whitespace is trimmed automatically.
    Raises ``InvalidTitleError`` on violation.
    """

    value: str

    def __post_init__(self) -> None:
        # Trim first so validation operates on the canonical form.
        trimmed = self.value.strip()
        # Bypass frozen restriction to store the trimmed value.
        object.__setattr__(self, "value", trimmed)

        if not trimmed:
            raise InvalidTitleError("TodoTitle must not be blank or whitespace-only")
        if len(trimmed) > TITLE_MAX_LENGTH:
            raise InvalidTitleError(
                f"TodoTitle must not exceed {TITLE_MAX_LENGTH} characters "
                f"(got {len(trimmed)})"
            )

    def __str__(self) -> str:
        return self.value


class TodoStatus(str, Enum):
    """Lifecycle state of a Todo.

    Transitions are enforced by the ``Todo`` Aggregate; this enum carries no
    transition logic itself.
    """

    ACTIVE = "active"
    COMPLETED = "completed"


class FilterCriteria(str, Enum):
    """View-selection criterion used by the Application Layer.

    Never placed on the ``Todo`` Aggregate itself.
    Default value is ``ALL``.
    """

    ALL = "all"
    ACTIVE = "active"
    COMPLETED = "completed"

    @classmethod
    def default(cls) -> FilterCriteria:
        """Return the default filter (``all``)."""
        return cls.ALL


@dataclass(frozen=True)
class Timestamp:
    """ISO 8601 UTC datetime string.

    Immutable once set.  Equality is by value (string comparison).
    """

    value: str

    @classmethod
    def now(cls) -> Timestamp:
        """Return a ``Timestamp`` representing the current UTC instant."""
        return cls(datetime.now(timezone.utc).isoformat())

    def __str__(self) -> str:
        return self.value
