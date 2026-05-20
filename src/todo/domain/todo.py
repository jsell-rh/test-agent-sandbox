"""Todo aggregate — the consistency boundary for a single Todo item.

All business rules about what a valid Todo is and what state changes are
permissible live inside this class. No logic is delegated to Services.
"""

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
    Timestamp,
    TodoId,
    TodoStatus,
    TodoTitle,
)


class Todo:
    """
    Aggregate root for a Todo item.

    Invariants enforced here (not in services or repositories):

    1. TodoTitle must not be blank (enforced by TodoTitle value object).
    2. TodoTitle must not exceed TODO_TITLE_MAX_LENGTH characters (enforced by TodoTitle).
    3. complete() on an already-completed Todo is idempotent — no event emitted.
    4. reopen() on an already-active Todo is idempotent — no event emitted.
    5. A Todo cannot be created without a TodoTitle (factory signature enforces this).
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
    # Properties (read-only access to state)
    # ------------------------------------------------------------------

    @property
    def id(self) -> TodoId:
        """Immutable identity of this Todo."""
        return self._id

    @property
    def title(self) -> TodoTitle:
        """Current title; mutable via update_title()."""
        return self._title

    @property
    def status(self) -> TodoStatus:
        """Current lifecycle state; transitions via complete() / reopen()."""
        return self._status

    @property
    def created_at(self) -> Timestamp:
        """Immutable creation timestamp."""
        return self._created_at

    @property
    def updated_at(self) -> Timestamp:
        """Timestamp of the last mutation."""
        return self._updated_at

    # ------------------------------------------------------------------
    # Factory methods
    # ------------------------------------------------------------------

    @classmethod
    def create(cls, title: TodoTitle) -> Todo:
        """
        Create a new Todo with status active.

        Validates invariants, assigns a fresh TodoId, and emits TodoCreated.

        Args:
            title: A validated TodoTitle value object.

        Returns:
            A new Todo instance with one pending TodoCreated event.
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
        Loading from storage must never re-emit TodoCreated.
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
        Transition to completed.

        Idempotent: calling on an already-completed Todo is a no-op (no event emitted).
        Emits TodoCompleted on a real active -> completed transition.
        """
        if self._status is TodoStatus.COMPLETED:
            return
        self._status = TodoStatus.COMPLETED
        now = Timestamp.now()
        self._updated_at = now
        self._events.append(TodoCompleted(todo_id=self._id, occurred_at=now))

    def reopen(self) -> None:
        """
        Transition back to active.

        Idempotent: calling on an already-active Todo is a no-op (no event emitted).
        Emits TodoReopened on a real completed -> active transition.
        """
        if self._status is TodoStatus.ACTIVE:
            return
        self._status = TodoStatus.ACTIVE
        now = Timestamp.now()
        self._updated_at = now
        self._events.append(TodoReopened(todo_id=self._id, occurred_at=now))

    def update_title(self, new_title: TodoTitle) -> None:
        """
        Replace the current title with a new validated TodoTitle.

        Emits TodoTitleUpdated.

        Args:
            new_title: A validated TodoTitle value object.

        Raises:
            InvalidTitleError: propagated from TodoTitle if new_title is invalid.
        """
        self._title = new_title
        now = Timestamp.now()
        self._updated_at = now
        self._events.append(
            TodoTitleUpdated(todo_id=self._id, occurred_at=now, new_title=new_title)
        )

    def delete(self) -> None:
        """
        Mark intent to delete this Todo.

        Emits TodoDeleted. Actual removal from storage is delegated to the repository.
        """
        now = Timestamp.now()
        self._events.append(TodoDeleted(todo_id=self._id, occurred_at=now))

    # ------------------------------------------------------------------
    # Event collection
    # ------------------------------------------------------------------

    def pull_events(self) -> list[DomainEvent]:
        """
        Drain and return all pending domain events.

        Subsequent calls return an empty list until more events are emitted.
        """
        events = list(self._events)
        self._events.clear()
        return events

    # ------------------------------------------------------------------
    # Dunder helpers
    # ------------------------------------------------------------------

    def __repr__(self) -> str:
        return (
            f"Todo(id={self._id.value!r}, title={self._title.value!r}, "
            f"status={self._status.value!r})"
        )
