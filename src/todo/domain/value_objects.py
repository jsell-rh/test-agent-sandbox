"""Value objects for the Todo bounded context."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum

from todo.domain.errors import InvalidTitleError

TODO_TITLE_MAX_LENGTH = 500


class TodoStatus(str, Enum):
    """Lifecycle state of a Todo."""

    ACTIVE = "active"
    COMPLETED = "completed"


class FilterCriteria(str, Enum):
    """View selection for listing Todos."""

    ALL = "all"
    ACTIVE = "active"
    COMPLETED = "completed"


@dataclass(frozen=True)
class TodoId:
    """Stable, globally-unique identifier for a Todo. Immutable."""

    value: str

    def __post_init__(self) -> None:
        if not self.value:
            raise ValueError("TodoId cannot be empty")

    @classmethod
    def generate(cls) -> TodoId:
        """Generate a new random UUID v4 TodoId."""
        return cls(value=str(uuid.uuid4()))

    @classmethod
    def of(cls, value: str) -> TodoId:
        """Construct a TodoId from an existing string value."""
        return cls(value=value)

    def __str__(self) -> str:
        return self.value


@dataclass(frozen=True)
class TodoTitle:
    """Human-readable description of work to be done. Immutable, trimmed."""

    value: str

    def __post_init__(self) -> None:
        # Trim leading/trailing whitespace before validation (frozen bypass is valid in __post_init__)
        object.__setattr__(self, "value", self.value.strip())
        if not self.value:
            raise InvalidTitleError("TodoTitle cannot be blank or whitespace-only")
        if len(self.value) > TODO_TITLE_MAX_LENGTH:
            raise InvalidTitleError(
                f"TodoTitle cannot exceed {TODO_TITLE_MAX_LENGTH} characters"
            )

    def __str__(self) -> str:
        return self.value


@dataclass(frozen=True)
class Timestamp:
    """ISO 8601 UTC datetime string. Immutable once set."""

    value: str

    @classmethod
    def now(cls) -> Timestamp:
        """Return the current UTC time as an ISO 8601 Timestamp."""
        return cls(value=datetime.now(timezone.utc).isoformat())

    def __str__(self) -> str:
        return self.value
