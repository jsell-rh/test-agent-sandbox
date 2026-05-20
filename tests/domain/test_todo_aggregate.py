"""Todo aggregate tests for the Todo bounded context.

Covers the TDD Plan cases from specs/domain-model.spec.md:

Todo.create()
  - Returns a Todo with status ACTIVE
  - Assigns a non-null TodoId
  - Emits exactly one TodoCreated event
  - Raises InvalidTitleError when title is invalid

todo.complete()
  - Transitions active -> completed, emits TodoCompleted
  - Calling on already-completed Todo: no state change, no event emitted (idempotent)

todo.reopen()
  - Transitions completed -> active, emits TodoReopened
  - Calling on already-active Todo: no state change, no event emitted (idempotent)

todo.update_title()
  - Updates title, emits TodoTitleUpdated
  - Raises InvalidTitleError when new title is invalid; original title unchanged

todo.delete()
  - Emits TodoDeleted

Failure modes
  - Create with empty title: InvalidTitleError raised before any side effects
  - Update to whitespace title: InvalidTitleError; original title unchanged
  - Complete an already-completed Todo: idempotent no-op; no duplicate event
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


def _create(title: str = "Buy milk") -> Todo:
    """Convenience: create a fresh Todo with a valid title."""
    return Todo.create(TodoTitle(title))


# ---------------------------------------------------------------------------
# Todo.create()
# ---------------------------------------------------------------------------


class TestTodoCreate:
    """Factory method invariants."""

    def test_status_is_active(self) -> None:
        todo = _create()
        assert todo.status is TodoStatus.ACTIVE

    def test_id_is_assigned(self) -> None:
        todo = _create()
        assert isinstance(todo.id, TodoId)
        assert todo.id.value  # non-empty

    def test_two_todos_have_distinct_ids(self) -> None:
        a = _create()
        b = _create()
        assert a.id != b.id

    def test_title_is_preserved(self) -> None:
        todo = _create("Walk the dog")
        assert todo.title == TodoTitle("Walk the dog")

    def test_emits_exactly_one_todo_created_event(self) -> None:
        todo = _create()
        events = todo.domain_events
        assert len(events) == 1
        assert isinstance(events[0], TodoCreated)

    def test_created_event_carries_correct_todo_id(self) -> None:
        todo = _create()
        event = todo.domain_events[0]
        assert isinstance(event, TodoCreated)
        assert event.todo_id == todo.id

    def test_created_event_carries_correct_title(self) -> None:
        todo = _create("Walk the dog")
        event = todo.domain_events[0]
        assert isinstance(event, TodoCreated)
        assert event.title == TodoTitle("Walk the dog")

    def test_created_event_has_occurred_at(self) -> None:
        todo = _create()
        event = todo.domain_events[0]
        assert isinstance(event, TodoCreated)
        assert event.occurred_at.value  # non-empty string

    def test_created_at_equals_updated_at_initially(self) -> None:
        todo = _create()
        assert todo.created_at == todo.updated_at

    def test_raises_invalid_title_error_on_empty_title(self) -> None:
        with pytest.raises(InvalidTitleError):
            Todo.create(TodoTitle(""))

    def test_raises_invalid_title_error_on_whitespace_title(self) -> None:
        with pytest.raises(InvalidTitleError):
            Todo.create(TodoTitle("   "))

    def test_no_events_emitted_on_failed_create(self) -> None:
        """InvalidTitleError prevents any aggregate construction."""
        with pytest.raises(InvalidTitleError):
            Todo.create(TodoTitle(""))
        # The exception is raised before any Todo is returned, so there is
        # nothing to inspect — just confirming no partial state leaks.


# ---------------------------------------------------------------------------
# todo.complete()
# ---------------------------------------------------------------------------


class TestTodoComplete:
    """complete() command method invariants."""

    def test_transitions_active_to_completed(self) -> None:
        todo = _create()
        todo.complete()
        assert todo.status is TodoStatus.COMPLETED

    def test_emits_todo_completed_event(self) -> None:
        todo = _create()
        todo.clear_events()
        todo.complete()
        events = todo.domain_events
        assert len(events) == 1
        assert isinstance(events[0], TodoCompleted)

    def test_completed_event_carries_correct_todo_id(self) -> None:
        todo = _create()
        todo.clear_events()
        todo.complete()
        event = todo.domain_events[0]
        assert isinstance(event, TodoCompleted)
        assert event.todo_id == todo.id

    def test_updates_updated_at(self) -> None:
        todo = _create()
        original_updated_at = todo.updated_at
        todo.complete()
        # updated_at must not be earlier than the original value
        assert todo.updated_at.value >= original_updated_at.value

    def test_idempotent_no_state_change_when_already_completed(self) -> None:
        todo = _create()
        todo.complete()
        first_updated_at = todo.updated_at
        todo.complete()  # second call
        assert todo.status is TodoStatus.COMPLETED
        # updated_at must not have changed on the second call
        assert todo.updated_at == first_updated_at

    def test_idempotent_no_duplicate_event_when_already_completed(self) -> None:
        todo = _create()
        todo.clear_events()
        todo.complete()
        todo.complete()  # second call — no event should be added
        completed_events = [e for e in todo.domain_events if isinstance(e, TodoCompleted)]
        assert len(completed_events) == 1


# ---------------------------------------------------------------------------
# todo.reopen()
# ---------------------------------------------------------------------------


class TestTodoReopen:
    """reopen() command method invariants."""

    def test_transitions_completed_to_active(self) -> None:
        todo = _create()
        todo.complete()
        todo.reopen()
        assert todo.status is TodoStatus.ACTIVE

    def test_emits_todo_reopened_event(self) -> None:
        todo = _create()
        todo.complete()
        todo.clear_events()
        todo.reopen()
        events = todo.domain_events
        assert len(events) == 1
        assert isinstance(events[0], TodoReopened)

    def test_reopened_event_carries_correct_todo_id(self) -> None:
        todo = _create()
        todo.complete()
        todo.clear_events()
        todo.reopen()
        event = todo.domain_events[0]
        assert isinstance(event, TodoReopened)
        assert event.todo_id == todo.id

    def test_updates_updated_at(self) -> None:
        todo = _create()
        todo.complete()
        completed_updated_at = todo.updated_at
        todo.reopen()
        assert todo.updated_at.value >= completed_updated_at.value

    def test_idempotent_no_state_change_when_already_active(self) -> None:
        todo = _create()
        first_updated_at = todo.updated_at
        todo.reopen()  # already active — no-op
        assert todo.status is TodoStatus.ACTIVE
        assert todo.updated_at == first_updated_at

    def test_idempotent_no_event_emitted_when_already_active(self) -> None:
        todo = _create()
        todo.clear_events()
        todo.reopen()  # already active — no-op
        reopened_events = [e for e in todo.domain_events if isinstance(e, TodoReopened)]
        assert len(reopened_events) == 0


# ---------------------------------------------------------------------------
# todo.update_title()
# ---------------------------------------------------------------------------


class TestTodoUpdateTitle:
    """update_title() command method invariants."""

    def test_updates_title(self) -> None:
        todo = _create("Buy milk")
        todo.update_title(TodoTitle("Buy oat milk"))
        assert todo.title == TodoTitle("Buy oat milk")

    def test_emits_todo_title_updated_event(self) -> None:
        todo = _create()
        todo.clear_events()
        todo.update_title(TodoTitle("New title"))
        events = todo.domain_events
        assert len(events) == 1
        assert isinstance(events[0], TodoTitleUpdated)

    def test_title_updated_event_carries_new_title(self) -> None:
        todo = _create()
        todo.clear_events()
        todo.update_title(TodoTitle("New title"))
        event = todo.domain_events[0]
        assert isinstance(event, TodoTitleUpdated)
        assert event.new_title == TodoTitle("New title")

    def test_title_updated_event_carries_correct_todo_id(self) -> None:
        todo = _create()
        todo.clear_events()
        todo.update_title(TodoTitle("New title"))
        event = todo.domain_events[0]
        assert isinstance(event, TodoTitleUpdated)
        assert event.todo_id == todo.id

    def test_updates_updated_at(self) -> None:
        todo = _create()
        original = todo.updated_at
        todo.update_title(TodoTitle("New title"))
        assert todo.updated_at.value >= original.value

    def test_raises_invalid_title_error_on_empty_new_title(self) -> None:
        todo = _create("Original title")
        with pytest.raises(InvalidTitleError):
            todo.update_title(TodoTitle(""))

    def test_raises_invalid_title_error_on_whitespace_new_title(self) -> None:
        todo = _create("Original title")
        with pytest.raises(InvalidTitleError):
            todo.update_title(TodoTitle("   "))

    def test_original_title_unchanged_after_invalid_update(self) -> None:
        """InvalidTitleError raised by TodoTitle before update_title touches state."""
        todo = _create("Original title")
        with pytest.raises(InvalidTitleError):
            todo.update_title(TodoTitle("   "))
        assert todo.title == TodoTitle("Original title")

    def test_no_event_emitted_after_invalid_update(self) -> None:
        todo = _create("Original title")
        todo.clear_events()
        with pytest.raises(InvalidTitleError):
            todo.update_title(TodoTitle(""))
        assert len(todo.domain_events) == 0


# ---------------------------------------------------------------------------
# todo.delete()
# ---------------------------------------------------------------------------


class TestTodoDelete:
    """delete() command method invariants."""

    def test_emits_todo_deleted_event(self) -> None:
        todo = _create()
        todo.clear_events()
        todo.delete()
        events = todo.domain_events
        assert len(events) == 1
        assert isinstance(events[0], TodoDeleted)

    def test_deleted_event_carries_correct_todo_id(self) -> None:
        todo = _create()
        todo.clear_events()
        todo.delete()
        event = todo.domain_events[0]
        assert isinstance(event, TodoDeleted)
        assert event.todo_id == todo.id

    def test_deleted_event_has_occurred_at(self) -> None:
        todo = _create()
        todo.clear_events()
        todo.delete()
        event = todo.domain_events[0]
        assert isinstance(event, TodoDeleted)
        assert event.occurred_at.value


# ---------------------------------------------------------------------------
# clear_events()
# ---------------------------------------------------------------------------


class TestClearEvents:
    """Utility method for the Application Layer."""

    def test_clears_all_pending_events(self) -> None:
        todo = _create()
        assert len(todo.domain_events) == 1  # TodoCreated
        todo.clear_events()
        assert todo.domain_events == []

    def test_domain_events_returns_snapshot(self) -> None:
        """Mutations to the returned list must not affect aggregate internals."""
        todo = _create()
        snapshot = todo.domain_events
        snapshot.clear()
        assert len(todo.domain_events) == 1  # still has TodoCreated
