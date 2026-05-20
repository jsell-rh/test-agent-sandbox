"""Domain Events emitted by the Todo Aggregate.

All events are immutable records.  They are collected on the Aggregate after
each state change and consumed by the Application Layer.
"""

from __future__ import annotations

from dataclasses import dataclass

from todo.domain.value_objects import Timestamp, TodoId, TodoTitle


@dataclass(frozen=True)
class TodoCreated:
    """Emitted when a new Todo is created via ``Todo.create()``."""

    todo_id: TodoId
    title: TodoTitle
    occurred_at: Timestamp


@dataclass(frozen=True)
class TodoCompleted:
    """Emitted when a Todo transitions to ``completed``."""

    todo_id: TodoId
    occurred_at: Timestamp


@dataclass(frozen=True)
class TodoReopened:
    """Emitted when a completed Todo transitions back to ``active``."""

    todo_id: TodoId
    occurred_at: Timestamp


@dataclass(frozen=True)
class TodoTitleUpdated:
    """Emitted when a Todo's title is changed."""

    todo_id: TodoId
    new_title: TodoTitle
    occurred_at: Timestamp


@dataclass(frozen=True)
class TodoDeleted:
    """Emitted when a Todo is permanently removed."""

    todo_id: TodoId
    occurred_at: Timestamp
