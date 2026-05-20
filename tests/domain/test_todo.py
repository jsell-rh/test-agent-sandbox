"""Tests for the Todo Aggregate Root — written first per TDD discipline.

Covers: Todo.create(), complete(), reopen(), update_title(), delete(),
event collection, and all idempotency invariants from the spec.
"""
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
from todo.domain.value_objects import TodoStatus, TodoTitle


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_title(text: str = "Buy milk") -> TodoTitle:
    return TodoTitle(text)


def make_todo(text: str = "Buy milk") -> Todo:
    return Todo.create(make_title(text))


# ---------------------------------------------------------------------------
# Todo.create()
# ---------------------------------------------------------------------------


class TestTodoCreate:
    def test_returns_todo_with_active_status(self):
        todo = make_todo()
        assert todo.status == TodoStatus.ACTIVE

    def test_assigns_non_null_todo_id(self):
        todo = make_todo()
        assert todo.id is not None
        assert todo.id.value  # non-empty string

    def test_emits_exactly_one_todo_created_event(self):
        todo = make_todo()
        events = todo.events
        assert len(events) == 1
        assert isinstance(events[0], TodoCreated)

    def test_created_event_carries_correct_todo_id_and_title(self):
        title = make_title("Write specs")
        todo = Todo.create(title)
        event = todo.events[0]
        assert isinstance(event, TodoCreated)
        assert event.todoId == todo.id
        assert event.title == title

    def test_raises_invalid_title_error_for_blank_title(self):
        """InvalidTitleError is raised before any state is created."""
        with pytest.raises(InvalidTitleError):
            Todo.create(TodoTitle(""))

    def test_raises_invalid_title_error_for_whitespace_title(self):
        with pytest.raises(InvalidTitleError):
            Todo.create(TodoTitle("   "))

    def test_sets_created_at_and_updated_at_to_same_timestamp(self):
        todo = make_todo()
        assert todo.created_at == todo.updated_at

    def test_two_todos_have_unique_ids(self):
        todo1 = make_todo()
        todo2 = make_todo()
        assert todo1.id != todo2.id

    def test_title_is_stored_correctly(self):
        title = make_title("Finish the project")
        todo = Todo.create(title)
        assert todo.title == title


# ---------------------------------------------------------------------------
# todo.complete()
# ---------------------------------------------------------------------------


class TestTodoComplete:
    def test_transitions_active_to_completed(self):
        todo = make_todo()
        todo.complete()
        assert todo.status == TodoStatus.COMPLETED

    def test_emits_todo_completed_event(self):
        todo = make_todo()
        todo.collect_events()  # drain creation event
        event = todo.complete()
        assert isinstance(event, TodoCompleted)
        assert event.todoId == todo.id

    def test_completed_event_in_events_list(self):
        todo = make_todo()
        todo.collect_events()
        todo.complete()
        assert any(isinstance(e, TodoCompleted) for e in todo.events)

    def test_idempotent_when_already_completed(self):
        """Calling complete() on a completed Todo is a no-op; no event emitted."""
        todo = make_todo()
        todo.complete()
        todo.collect_events()  # drain all events so far

        result = todo.complete()  # second call
        assert result is None
        assert todo.status == TodoStatus.COMPLETED
        assert len(todo.events) == 0  # no new event emitted

    def test_updated_at_is_set_after_complete(self):
        todo = make_todo()
        todo.complete()
        assert todo.updated_at is not None


# ---------------------------------------------------------------------------
# todo.reopen()
# ---------------------------------------------------------------------------


class TestTodoReopen:
    def _completed_todo(self) -> Todo:
        todo = make_todo()
        todo.complete()
        todo.collect_events()
        return todo

    def test_transitions_completed_to_active(self):
        todo = self._completed_todo()
        todo.reopen()
        assert todo.status == TodoStatus.ACTIVE

    def test_emits_todo_reopened_event(self):
        todo = self._completed_todo()
        event = todo.reopen()
        assert isinstance(event, TodoReopened)
        assert event.todoId == todo.id

    def test_reopened_event_in_events_list(self):
        todo = self._completed_todo()
        todo.reopen()
        assert any(isinstance(e, TodoReopened) for e in todo.events)

    def test_idempotent_when_already_active(self):
        """Calling reopen() on an active Todo is a no-op; no event emitted."""
        todo = make_todo()
        todo.collect_events()  # drain creation event

        result = todo.reopen()  # already active
        assert result is None
        assert todo.status == TodoStatus.ACTIVE
        assert len(todo.events) == 0  # no new event emitted


# ---------------------------------------------------------------------------
# todo.update_title()
# ---------------------------------------------------------------------------


class TestTodoUpdateTitle:
    def test_updates_title(self):
        todo = make_todo("Old title")
        new_title = TodoTitle("New title")
        todo.update_title(new_title)
        assert todo.title == new_title

    def test_emits_todo_title_updated_event(self):
        todo = make_todo()
        todo.collect_events()
        new_title = TodoTitle("New title")
        event = todo.update_title(new_title)
        assert isinstance(event, TodoTitleUpdated)
        assert event.todoId == todo.id
        assert event.newTitle == new_title

    def test_title_updated_event_in_events_list(self):
        todo = make_todo()
        todo.collect_events()
        todo.update_title(TodoTitle("New title"))
        assert any(isinstance(e, TodoTitleUpdated) for e in todo.events)

    def test_raises_invalid_title_error_for_blank_new_title(self):
        """Original title must remain unchanged when invalid new title is given."""
        todo = make_todo("Original title")
        original = todo.title
        with pytest.raises(InvalidTitleError):
            todo.update_title(TodoTitle(""))
        assert todo.title == original

    def test_raises_invalid_title_error_for_whitespace_new_title(self):
        todo = make_todo("Original title")
        original = todo.title
        with pytest.raises(InvalidTitleError):
            todo.update_title(TodoTitle("   "))
        assert todo.title == original

    def test_updated_at_changes_after_update_title(self):
        todo = make_todo()
        todo.update_title(TodoTitle("New title"))
        assert todo.updated_at is not None


# ---------------------------------------------------------------------------
# todo.delete()
# ---------------------------------------------------------------------------


class TestTodoDelete:
    def test_emits_todo_deleted_event(self):
        todo = make_todo()
        todo.collect_events()
        event = todo.delete()
        assert isinstance(event, TodoDeleted)
        assert event.todoId == todo.id

    def test_deleted_event_in_events_list(self):
        todo = make_todo()
        todo.collect_events()
        todo.delete()
        assert any(isinstance(e, TodoDeleted) for e in todo.events)


# ---------------------------------------------------------------------------
# collect_events()
# ---------------------------------------------------------------------------


class TestCollectEvents:
    def test_collect_events_returns_all_pending_events(self):
        todo = make_todo()
        events = todo.collect_events()
        assert len(events) == 1
        assert isinstance(events[0], TodoCreated)

    def test_collect_events_clears_the_pending_list(self):
        todo = make_todo()
        todo.collect_events()  # drain
        assert len(todo.events) == 0

    def test_events_accumulate_across_commands(self):
        todo = make_todo()
        todo.complete()
        todo.reopen()
        events = todo.collect_events()
        types = [type(e) for e in events]
        assert TodoCreated in types
        assert TodoCompleted in types
        assert TodoReopened in types

    def test_events_property_does_not_clear_the_list(self):
        """Reading .events must not consume them; only collect_events() does."""
        todo = make_todo()
        _ = todo.events  # read once
        assert len(todo.events) == 1  # still there
