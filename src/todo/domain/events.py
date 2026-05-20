"""Domain events emitted by the Todo aggregate.

All events are immutable records. They are emitted after a state change is applied
inside the Aggregate and collected via Todo.pull_events().
"""

from __future__ import annotations

from dataclasses import dataclass

from todo.domain.value_objects import Timestamp, TodoId, TodoTitle


@dataclass(frozen=True)
class DomainEvent:
    """Base class for all Todo domain events."""

    todo_id: TodoId
    occurred_at: Timestamp


@dataclass(frozen=True)
class TodoCreated(DomainEvent):
    """Emitted when a new Todo is created via Todo.create()."""

    title: TodoTitle


@dataclass(frozen=True)
class TodoCompleted(DomainEvent):
    """Emitted when a Todo transitions from active to completed."""


@dataclass(frozen=True)
class TodoReopened(DomainEvent):
    """Emitted when a completed Todo transitions back to active."""


@dataclass(frozen=True)
class TodoTitleUpdated(DomainEvent):
    """Emitted when a Todo's title is changed via update_title()."""

    new_title: TodoTitle


@dataclass(frozen=True)
class TodoDeleted(DomainEvent):
    """Emitted when todo.delete() marks intent to permanently remove a Todo."""
