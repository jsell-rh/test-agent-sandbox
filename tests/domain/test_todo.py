"""Tests for the Todo Aggregate Root.

Covers all critical TDD cases from the domain-model spec:
  - Todo.create(): status, id assignment, event emission, invalid title
  - todo.complete(): active->completed transition and idempotency
  - todo.reopen(): completed->active transition and idempotency
  - todo.update_title(): title replacement, event emission, invalid title
  - todo.delete(): event emission
  - Failure modes: whitespace title on update leaves original intact,
    duplicate complete emits no extra event.

All tests use domain objects directly — no persistence or HTTP.
"""

from __future__ import annotations

import pytest

from todo.domain.errors import InvalidTitleError
from todo.domain.events import (
    TodoCompleted,
    TodoCreated,
    TodoDeleted,
    TodoReopened,
    TodoTitleUpdated,
)
from todo.domain.todo import Todo
from todo.domain.value_objects import TodoId, TodoStatus, TodoTitle


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_active_todo(title: str = "Buy milk") -> Todo:
    """Return a fresh active Todo with pending events cleared."""
    todo = Todo.create(TodoTitle(title))
    todo.clear_events()
    return todo


def _make_completed_todo(title: str = "Buy milk") -> Todo:
    """Return a fresh completed Todo with pending events cleared."""
    todo = Todo.create(TodoTitle(title))
    todo.complete()
    todo.clear_events()
    return todo


# ---------------------------------------------------------------------------
# Todo.create()
# ---------------------------------------------------------------------------


class TestTodoCreate:
    """Factory method ``Todo.create()``."""

    def test_returns_todo_with_status_active(self) -> None:
        todo = Todo.create(TodoTitle("Buy milk"))
        assert todo.status is TodoStatus.ACTIVE

    def test_assigns_non_null_todo_id(self) -> None:
        todo = Todo.create(TodoTitle("Buy milk"))
        assert todo.id is not None
        assert isinstance(todo.id, TodoId)

    def test_assigned_id_is_non_empty_string(self) -> None:
        todo = Todo.create(TodoTitle("Buy milk"))
        assert todo.id.value  # truthy — not empty

    def test_emits_exactly_one_todo_created_event(self) -> None:
        todo = Todo.create(TodoTitle("Buy milk"))
        events = todo.domain_events
        assert len(events) == 1
        assert isinstance(events[0], TodoCreated)

    def test_todo_created_event_carries_correct_title(self) -> None:
        title = TodoTitle("Buy milk")
        todo = Todo.create(title)
        event = todo.domain_events[0]
        assert isinstance(event, TodoCreated)
        assert event.title == title

    def test_todo_created_event_carries_matching_todo_id(self) -> None:
        todo = Todo.create(TodoTitle("Buy milk"))
        event = todo.domain_events[0]
        assert isinstance(event, TodoCreated)
        assert event.todo_id == todo.id

    def test_raises_invalid_title_error_for_blank_title(self) -> None:
        with pytest.raises(InvalidTitleError):
            Todo.create(TodoTitle(""))

    def test_raises_invalid_title_error_for_whitespace_only_title(self) -> None:
        with pytest.raises(InvalidTitleError):
            Todo.create(TodoTitle("   "))


# ---------------------------------------------------------------------------
# todo.complete()
# ---------------------------------------------------------------------------


class TestTodoComplete:
    """Command method ``todo.complete()``."""

    def test_transitions_status_from_active_to_completed(self) -> None:
        todo = _make_active_todo()
        todo.complete()
        assert todo.status is TodoStatus.COMPLETED

    def test_emits_todo_completed_event(self) -> None:
        todo = _make_active_todo()
        todo.complete()
        events = todo.domain_events
        assert len(events) == 1
        assert isinstance(events[0], TodoCompleted)

    def test_completed_event_carries_matching_todo_id(self) -> None:
        todo = _make_active_todo()
        todo.complete()
        event = todo.domain_events[0]
        assert isinstance(event, TodoCompleted)
        assert event.todo_id == todo.id

    def test_calling_complete_on_already_completed_todo_is_no_op(self) -> None:
        todo = _make_completed_todo()
        todo.complete()  # second call
        assert todo.status is TodoStatus.COMPLETED

    def test_calling_complete_on_already_completed_todo_emits_no_event(
        self,
    ) -> None:
        todo = _make_completed_todo()
        todo.complete()  # second call — must emit nothing
        assert todo.domain_events == []


# ---------------------------------------------------------------------------
# todo.reopen()
# ---------------------------------------------------------------------------


class TestTodoReopen:
    """Command method ``todo.reopen()``."""

    def test_transitions_status_from_completed_to_active(self) -> None:
        todo = _make_completed_todo()
        todo.reopen()
        assert todo.status is TodoStatus.ACTIVE

    def test_emits_todo_reopened_event(self) -> None:
        todo = _make_completed_todo()
        todo.reopen()
        events = todo.domain_events
        assert len(events) == 1
        assert isinstance(events[0], TodoReopened)

    def test_reopened_event_carries_matching_todo_id(self) -> None:
        todo = _make_completed_todo()
        todo.reopen()
        event = todo.domain_events[0]
        assert isinstance(event, TodoReopened)
        assert event.todo_id == todo.id

    def test_calling_reopen_on_already_active_todo_is_no_op(self) -> None:
        todo = _make_active_todo()
        todo.reopen()  # already active
        assert todo.status is TodoStatus.ACTIVE

    def test_calling_reopen_on_already_active_todo_emits_no_event(self) -> None:
        todo = _make_active_todo()
        todo.reopen()  # already active — must emit nothing
        assert todo.domain_events == []


# ---------------------------------------------------------------------------
# todo.update_title()
# ---------------------------------------------------------------------------


class TestTodoUpdateTitle:
    """Command method ``todo.update_title()``."""

    def test_updates_title_on_aggregate(self) -> None:
        todo = _make_active_todo("Original")
        todo.update_title(TodoTitle("Updated"))
        assert todo.title == TodoTitle("Updated")

    def test_emits_todo_title_updated_event(self) -> None:
        todo = _make_active_todo()
        todo.update_title(TodoTitle("New title"))
        events = todo.domain_events
        assert len(events) == 1
        assert isinstance(events[0], TodoTitleUpdated)

    def test_title_updated_event_carries_new_title(self) -> None:
        todo = _make_active_todo()
        new_title = TodoTitle("New title")
        todo.update_title(new_title)
        event = todo.domain_events[0]
        assert isinstance(event, TodoTitleUpdated)
        assert event.new_title == new_title

    def test_title_updated_event_carries_matching_todo_id(self) -> None:
        todo = _make_active_todo()
        todo.update_title(TodoTitle("New title"))
        event = todo.domain_events[0]
        assert isinstance(event, TodoTitleUpdated)
        assert event.todo_id == todo.id

    def test_raises_invalid_title_error_for_blank_new_title(self) -> None:
        with pytest.raises(InvalidTitleError):
            todo = _make_active_todo("Original")
            todo.update_title(TodoTitle(""))

    def test_raises_invalid_title_error_for_whitespace_only_new_title(self) -> None:
        with pytest.raises(InvalidTitleError):
            todo = _make_active_todo("Original")
            todo.update_title(TodoTitle("   "))


# ---------------------------------------------------------------------------
# todo.delete()
# ---------------------------------------------------------------------------


class TestTodoDelete:
    """Command method ``todo.delete()``."""

    def test_emits_todo_deleted_event(self) -> None:
        todo = _make_active_todo()
        todo.delete()
        events = todo.domain_events
        assert len(events) == 1
        assert isinstance(events[0], TodoDeleted)

    def test_deleted_event_carries_matching_todo_id(self) -> None:
        todo = _make_active_todo()
        todo.delete()
        event = todo.domain_events[0]
        assert isinstance(event, TodoDeleted)
        assert event.todo_id == todo.id


# ---------------------------------------------------------------------------
# Failure modes
# ---------------------------------------------------------------------------


class TestFailureModes:
    """Cross-cutting invariant failures from the spec's Failure Modes table."""

    def test_create_with_empty_title_raises_before_any_persistence(self) -> None:
        """InvalidTitleError must be raised at the value object level.

        No Todo is created, so no persistence call could possibly occur.
        """
        with pytest.raises(InvalidTitleError):
            Todo.create(TodoTitle(""))

    def test_update_to_whitespace_title_leaves_original_title_unchanged(
        self,
    ) -> None:
        """When update_title() fails, the aggregate's title must be unchanged."""
        original_title = TodoTitle("Original title")
        todo = _make_active_todo("Original title")

        with pytest.raises(InvalidTitleError):
            todo.update_title(TodoTitle("   "))

        assert todo.title == original_title

    def test_update_to_whitespace_title_emits_no_event(self) -> None:
        """A failed update_title() must not leave a partial event on the aggregate."""
        todo = _make_active_todo("Original title")

        with pytest.raises(InvalidTitleError):
            todo.update_title(TodoTitle("   "))

        assert todo.domain_events == []

    def test_complete_already_completed_produces_no_duplicate_event(self) -> None:
        """Idempotent complete() must never emit a second TodoCompleted."""
        todo = _make_completed_todo()
        todo.complete()  # second call
        assert todo.domain_events == []
