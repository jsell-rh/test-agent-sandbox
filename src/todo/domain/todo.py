"""Todo Aggregate Root.

Encapsulates all business rules for the Todo bounded context.  Persistence
and HTTP concerns are explicitly excluded.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from todo.domain.events import (
    TodoCompleted,
    TodoCreated,
    TodoDeleted,
    TodoReopened,
    TodoTitleUpdated,
)
from todo.domain.value_objects import (
    FilterCriteria,  # noqa: F401 — re-exported for convenience
    Timestamp,
    TodoId,
    TodoStatus,
    TodoTitle,
)

if TYPE_CHECKING:
    pass

# Type alias for the union of all domain events
DomainEvent = TodoCreated | TodoCompleted | TodoReopened | TodoTitleUpdated | TodoDeleted


class Todo:
    """Aggregate Root for the Todo bounded context.

    Use the class methods :meth:`create` and :meth:`reconstitute` to obtain
    instances; do *not* call ``__init__`` directly.
    """

    __slots__ = (
        "_id",
        "_title",
        "_status",
        "_created_at",
        "_updated_at",
        "_events",
    )

    def __init__(
        self,
        id: TodoId,
        title: TodoTitle,
        status: TodoStatus,
        created_at: Timestamp,
        updated_at: Timestamp,
    ) -> None:
        self._id = id
        self._title = title
        self._status = status
        self._created_at = created_at
        self._updated_at = updated_at
        self._events: list[DomainEvent] = []

    # ------------------------------------------------------------------
    # Factory methods
    # ------------------------------------------------------------------

    @classmethod
    def create(cls, title: TodoTitle) -> "Todo":
        """Create a new Todo.

        Validates ``title``, assigns a new ``TodoId``, sets status to
        ``active``, and emits :class:`~todo.domain.events.TodoCreated`.

        Args:
            title: A valid ``TodoTitle`` (validation is on ``TodoTitle``
                itself — pass a ``TodoTitle`` instance, not a raw string).

        Returns:
            A new ``Todo`` with one pending ``TodoCreated`` event.
        """
        now = Timestamp.now()
        todo = cls(
            id=TodoId.generate(),
            title=title,
            status=TodoStatus.ACTIVE,
            created_at=now,
            updated_at=now,
        )
        todo._events.append(
            TodoCreated(todo_id=todo._id, title=title, occurred_at=now)
        )
        return todo

    @classmethod
    def reconstitute(
        cls,
        id: TodoId,
        title: TodoTitle,
        status: TodoStatus,
        created_at: Timestamp,
        updated_at: Timestamp,
    ) -> "Todo":
        """Reconstruct a Todo from persisted state without emitting events.

        Called exclusively by the persistence layer.  Unlike :meth:`create`,
        no domain events are appended to the returned aggregate.
        """
        return cls(
            id=id,
            title=title,
            status=status,
            created_at=created_at,
            updated_at=updated_at,
        )

    # ------------------------------------------------------------------
    # Properties
    # ------------------------------------------------------------------

    @property
    def id(self) -> TodoId:
        return self._id

    @property
    def title(self) -> TodoTitle:
        return self._title

    @property
    def status(self) -> TodoStatus:
        return self._status

    @property
    def created_at(self) -> Timestamp:
        return self._created_at

    @property
    def updated_at(self) -> Timestamp:
        return self._updated_at

    @property
    def domain_events(self) -> list[DomainEvent]:
        """Return a snapshot of collected domain events."""
        return list(self._events)

    def clear_events(self) -> None:
        """Discard all pending domain events."""
        self._events.clear()

    # ------------------------------------------------------------------
    # Command methods
    # ------------------------------------------------------------------

    def complete(self) -> None:
        """Transition to ``completed``.

        Idempotent: calling on an already-completed Todo is a no-op and
        emits no event.
        """
        if self._status is TodoStatus.COMPLETED:
            return
        now = Timestamp.now()
        self._status = TodoStatus.COMPLETED
        self._updated_at = now
        self._events.append(TodoCompleted(todo_id=self._id, occurred_at=now))

    def reopen(self) -> None:
        """Transition back to ``active``.

        Idempotent: calling on an already-active Todo is a no-op and emits
        no event.
        """
        if self._status is TodoStatus.ACTIVE:
            return
        now = Timestamp.now()
        self._status = TodoStatus.ACTIVE
        self._updated_at = now
        self._events.append(TodoReopened(todo_id=self._id, occurred_at=now))

    def update_title(self, new_title: TodoTitle) -> None:
        """Replace the title.

        Args:
            new_title: A valid ``TodoTitle``; ``InvalidTitleError`` is
                raised by ``TodoTitle`` itself for invalid values.
        """
        now = Timestamp.now()
        self._title = new_title
        self._updated_at = now
        self._events.append(
            TodoTitleUpdated(todo_id=self._id, new_title=new_title, occurred_at=now)
        )

    def delete(self) -> None:
        """Emit a ``TodoDeleted`` event.

        Actual removal from storage is delegated to the repository.
        """
        now = Timestamp.now()
        self._events.append(TodoDeleted(todo_id=self._id, occurred_at=now))
