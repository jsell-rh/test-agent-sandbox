"""Todo Aggregate Root for the Todo bounded context.

Business rules (invariants) live **here**, not in Services.  The ``Todo``
class is the only place that may mutate state and emit domain events.

Ubiquitous Language method names used verbatim:
  complete(), reopen()
  update_title()  — Python snake_case rendering of updateTitle()
  delete()
"""
from __future__ import annotations

from typing import Optional

from todo.domain.events import (
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
    """Aggregate Root representing a unit of work tracked by the user.

    Do not construct directly; use ``Todo.create()`` to enforce invariants
    and emit the ``TodoCreated`` event.
    """

    def __init__(
        self,
        id: TodoId,
        title: TodoTitle,
        status: TodoStatus,
        created_at: Timestamp,
        updated_at: Timestamp,
    ) -> None:
        self._id: TodoId = id
        self._title: TodoTitle = title
        self._status: TodoStatus = status
        self._created_at: Timestamp = created_at
        self._updated_at: Timestamp = updated_at
        self._events: list = []

    # ------------------------------------------------------------------
    # Factory
    # ------------------------------------------------------------------

    @classmethod
    def create(cls, title: TodoTitle) -> Todo:
        """Create a new ``Todo`` with ``status=active``.

        Validates invariants (delegated to ``TodoTitle``), assigns a new
        ``TodoId``, records timestamps, and emits ``TodoCreated``.

        Raises:
            InvalidTitleError: propagated from ``TodoTitle`` construction.
        """
        now = Timestamp.now()
        todo_id = TodoId.generate()
        todo = cls(
            id=todo_id,
            title=title,
            status=TodoStatus.ACTIVE,
            created_at=now,
            updated_at=now,
        )
        todo._events.append(
            TodoCreated(todoId=todo_id, title=title, occurredAt=now)
        )
        return todo

    # ------------------------------------------------------------------
    # Properties (read-only external interface)
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
    def events(self) -> list:
        """Return a snapshot of pending domain events (does not clear)."""
        return list(self._events)

    # ------------------------------------------------------------------
    # Event collection
    # ------------------------------------------------------------------

    def collect_events(self) -> list:
        """Return and clear all pending domain events.

        The Application Layer calls this after executing a command to
        dispatch events to interested subscribers.
        """
        pending = list(self._events)
        self._events.clear()
        return pending

    # ------------------------------------------------------------------
    # Command methods
    # ------------------------------------------------------------------

    def complete(self) -> Optional[TodoCompleted]:
        """Transition this Todo to ``completed``.

        Idempotent: if already ``completed``, returns ``None`` and emits no
        event.

        Returns:
            ``TodoCompleted`` event if the state changed; ``None`` otherwise.
        """
        if self._status == TodoStatus.COMPLETED:
            return None  # no-op — invariant 3

        now = Timestamp.now()
        self._status = TodoStatus.COMPLETED
        self._updated_at = now
        event = TodoCompleted(todoId=self._id, occurredAt=now)
        self._events.append(event)
        return event

    def reopen(self) -> Optional[TodoReopened]:
        """Transition this Todo back to ``active``.

        Idempotent: if already ``active``, returns ``None`` and emits no
        event.

        Returns:
            ``TodoReopened`` event if the state changed; ``None`` otherwise.
        """
        if self._status == TodoStatus.ACTIVE:
            return None  # no-op — invariant 4

        now = Timestamp.now()
        self._status = TodoStatus.ACTIVE
        self._updated_at = now
        event = TodoReopened(todoId=self._id, occurredAt=now)
        self._events.append(event)
        return event

    def update_title(self, new_title: TodoTitle) -> TodoTitleUpdated:
        """Replace the current title with ``new_title``.

        ``new_title`` must already be a valid ``TodoTitle`` (validation
        happens at ``TodoTitle`` construction time, before this method is
        called).

        Returns:
            ``TodoTitleUpdated`` event carrying the new title.
        """
        now = Timestamp.now()
        self._title = new_title
        self._updated_at = now
        event = TodoTitleUpdated(todoId=self._id, newTitle=new_title, occurredAt=now)
        self._events.append(event)
        return event

    def delete(self) -> TodoDeleted:
        """Mark this Todo for deletion and emit ``TodoDeleted``.

        Actual removal from the store is delegated to ``TodoRepository``.

        Returns:
            ``TodoDeleted`` event.
        """
        now = Timestamp.now()
        event = TodoDeleted(todoId=self._id, occurredAt=now)
        self._events.append(event)
        return event
