"""Domain events emitted by the Todo aggregate."""

from __future__ import annotations

from dataclasses import dataclass

from todo.domain.value_objects import Timestamp, TodoId, TodoTitle


@dataclass(frozen=True)
class DomainEvent:
    """Base class for all domain events."""

    todo_id: TodoId
    occurred_at: Timestamp


@dataclass(frozen=True)
class TodoCreated(DomainEvent):
    """Emitted when a new Todo is created."""

    title: TodoTitle


@dataclass(frozen=True)
class TodoCompleted(DomainEvent):
    """Emitted when a Todo transitions to completed."""


@dataclass(frozen=True)
class TodoReopened(DomainEvent):
    """Emitted when a completed Todo transitions back to active."""


@dataclass(frozen=True)
class TodoTitleUpdated(DomainEvent):
    """Emitted when a Todo's title is changed."""

    new_title: TodoTitle


@dataclass(frozen=True)
class TodoDeleted(DomainEvent):
    """Emitted when a Todo is permanently removed."""
