"""Tests for domain event immutability and structure."""

from __future__ import annotations

import pytest

from todo.domain.events import (
    DomainEvent,
    TodoCompleted,
    TodoCreated,
    TodoDeleted,
    TodoReopened,
    TodoTitleUpdated,
)
from todo.domain.value_objects import Timestamp, TodoId, TodoTitle


def _id() -> TodoId:
    return TodoId.generate()


def _ts() -> Timestamp:
    return Timestamp.now()


class TestDomainEvents:
    """Events are immutable records."""

    def test_todo_created_is_immutable(self) -> None:
        event = TodoCreated(todo_id=_id(), occurred_at=_ts(), title=TodoTitle("Buy milk"))
        with pytest.raises(Exception):
            event.title = TodoTitle("Buy oat milk")  # type: ignore[misc]

    def test_todo_completed_structure(self) -> None:
        tid = _id()
        ts = _ts()
        event = TodoCompleted(todo_id=tid, occurred_at=ts)
        assert event.todo_id == tid
        assert event.occurred_at == ts

    def test_todo_reopened_structure(self) -> None:
        event = TodoReopened(todo_id=_id(), occurred_at=_ts())
        assert isinstance(event, TodoReopened)

    def test_todo_title_updated_carries_new_title(self) -> None:
        new_title = TodoTitle("Buy oat milk")
        event = TodoTitleUpdated(todo_id=_id(), occurred_at=_ts(), new_title=new_title)
        assert event.new_title == new_title

    def test_todo_deleted_structure(self) -> None:
        event = TodoDeleted(todo_id=_id(), occurred_at=_ts())
        assert isinstance(event, TodoDeleted)

    def test_all_events_are_domain_event_subclasses(self) -> None:
        for cls in (TodoCreated, TodoCompleted, TodoReopened, TodoTitleUpdated, TodoDeleted):
            assert issubclass(cls, DomainEvent)
