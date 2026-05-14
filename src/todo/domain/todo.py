"""Todo aggregate — the consistency boundary for a single Todo item."""

from __future__ import annotations

from todo.domain.events import (
    DomainEvent,
    TodoCompleted,
    TodoCreated,
    TodoDeleted,
    TodoReopened,
    TodoTitleUpdated,
)
from todo.domain.value_objects import (
    FilterCriteria,  # re-exported for convenience
    Timestamp,
    TodoId,
    TodoStatus,
    TodoTitle,
)


class Todo:
    """
    Aggregate root for a Todo item.

    State transitions are enforced inside this class. Business rules live here,
    not in services or repositories.
    """

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

    # ------------------------------------------------------------------
    # Factory methods
    # ------------------------------------------------------------------

    @classmethod
    def create(cls, title: TodoTitle) -> Todo:
        """
        Create a new Todo, assigning a fresh TodoId and emitting TodoCreated.

        Raises:
            InvalidTitleError: if the title is invalid (blank or too long).
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
            TodoCreated(todo_id=todo._id, occurred_at=now, title=title)
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
    ) -> Todo:
        """
        Rebuild a Todo from persisted data without emitting any domain events.

        Used exclusively by the repository when loading from storage.
        """
        return cls(
            id=id,
            title=title,
            status=status,
            created_at=created_at,
            updated_at=updated_at,
        )

    # ------------------------------------------------------------------
    # Command methods
    # ------------------------------------------------------------------

    def complete(self) -> None:
        """
        Transition to completed. Idempotent — no-op if already completed.

        Emits TodoCompleted on a real transition.
        """
        if self._status is TodoStatus.COMPLETED:
            return
        self._status = TodoStatus.COMPLETED
        now = Timestamp.now()
        self._updated_at = now
        self._events.append(TodoCompleted(todo_id=self._id, occurred_at=now))

    def reopen(self) -> None:
        """
        Transition back to active. Idempotent — no-op if already active.

        Emits TodoReopened on a real transition.
        """
        if self._status is TodoStatus.ACTIVE:
            return
        self._status = TodoStatus.ACTIVE
        now = Timestamp.now()
        self._updated_at = now
        self._events.append(TodoReopened(todo_id=self._id, occurred_at=now))

    def update_title(self, new_title: TodoTitle) -> None:
        """
        Replace the current title.

        Raises:
            InvalidTitleError: if new_title is invalid (blank or too long).
        """
        self._title = new_title
        now = Timestamp.now()
        self._updated_at = now
        self._events.append(
            TodoTitleUpdated(todo_id=self._id, occurred_at=now, new_title=new_title)
        )

    def delete(self) -> None:
        """Mark intent to delete. Actual removal is delegated to the repository."""
        now = Timestamp.now()
        self._events.append(TodoDeleted(todo_id=self._id, occurred_at=now))

    # ------------------------------------------------------------------
    # Event collection
    # ------------------------------------------------------------------

    def pull_events(self) -> list[DomainEvent]:
        """Drain and return all pending domain events."""
        events = list(self._events)
        self._events.clear()
        return events

    def __repr__(self) -> str:
        return (
            f"Todo(id={self._id.value!r}, title={self._title.value!r}, "
            f"status={self._status.value!r})"
        )
