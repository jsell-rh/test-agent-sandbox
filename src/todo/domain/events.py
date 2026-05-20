"""Domain Events for the Todo bounded context.

Events are immutable records emitted by the ``Todo`` Aggregate *after* a
state change has been applied.  They describe what happened in the past and
carry enough data for downstream consumers to act without querying back.

Naming follows the Ubiquitous Language exactly:
  TodoCreated, TodoCompleted, TodoReopened, TodoTitleUpdated, TodoDeleted
"""
from __future__ import annotations

from dataclasses import dataclass

from todo.domain.value_objects import Timestamp, TodoId, TodoTitle


@dataclass(frozen=True)
class TodoCreated:
    """Emitted when a new Todo is successfully created."""

    todoId: TodoId
    title: TodoTitle
    occurredAt: Timestamp


@dataclass(frozen=True)
class TodoCompleted:
    """Emitted when a Todo transitions from ``active`` to ``completed``."""

    todoId: TodoId
    occurredAt: Timestamp


@dataclass(frozen=True)
class TodoReopened:
    """Emitted when a Todo transitions from ``completed`` back to ``active``."""

    todoId: TodoId
    occurredAt: Timestamp


@dataclass(frozen=True)
class TodoTitleUpdated:
    """Emitted when a Todo's title is changed."""

    todoId: TodoId
    newTitle: TodoTitle
    occurredAt: Timestamp


@dataclass(frozen=True)
class TodoDeleted:
    """Emitted when permanent removal of a Todo is requested.

    Actual removal is delegated to the ``TodoRepository``.
    """

    todoId: TodoId
    occurredAt: Timestamp
