"""Value Objects for the Todo bounded context.

All value objects are immutable and compared by value, never by identity.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from enum import Enum

from todo.domain.errors import InvalidTitleError

# ---------------------------------------------------------------------------
# Named constants — avoids magic numbers scattered through the domain
# ---------------------------------------------------------------------------

#: Maximum number of characters allowed in a TodoTitle.
TODO_TITLE_MAX_LENGTH: int = 500


# ---------------------------------------------------------------------------
# Value Objects
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class TodoId:
    """Stable, globally-unique identifier for a Todo (UUID v4 string)."""

    value: str

    @classmethod
    def generate(cls) -> "TodoId":
        """Generate a fresh random UUID v4 TodoId."""
        return cls(str(uuid.uuid4()))


@dataclass(frozen=True)
class TodoTitle:
    """Human-readable description of the work to be done.

    Invariants enforced on construction:
    - Must not be blank (empty or whitespace-only after trimming).
    - Must not exceed ``TODO_TITLE_MAX_LENGTH`` characters (after trimming).
    - Leading/trailing whitespace is stripped before storage.
    """

    value: str

    def __post_init__(self) -> None:
        stripped = self.value.strip()
        if not stripped:
            raise InvalidTitleError("TodoTitle must not be blank or whitespace-only")
        if len(stripped) > TODO_TITLE_MAX_LENGTH:
            raise InvalidTitleError(
                f"TodoTitle must not exceed {TODO_TITLE_MAX_LENGTH} characters"
            )
        # Bypass the frozen restriction to persist the trimmed value.
        object.__setattr__(self, "value", stripped)


class TodoStatus(str, Enum):
    """Lifecycle state of a Todo.

    Using ``str`` as a mixin means ``TodoStatus.ACTIVE == 'active'`` is
    ``True``, which simplifies round-tripping through SQLite TEXT columns.
    """

    ACTIVE = "active"
    COMPLETED = "completed"


class FilterCriteria(str, Enum):
    """View selection for listing todos.

    Used by the Application Layer; never applied on the Aggregate itself.
    """

    ALL = "all"
    ACTIVE = "active"
    COMPLETED = "completed"


@dataclass(frozen=True)
class Timestamp:
    """ISO 8601 UTC datetime string.

    Immutable once created.  Equality is by value (string comparison), which
    is consistent since all values share the same format.
    """

    value: str

    @classmethod
    def now(cls) -> "Timestamp":
        """Return a Timestamp representing the current UTC instant."""
        return cls(datetime.now(UTC).isoformat())
