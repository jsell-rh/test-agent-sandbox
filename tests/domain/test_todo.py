"""Tests for the Todo aggregate root."""

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
from todo.domain.value_objects import FilterCriteria, TodoStatus, TodoTitle
from todo.domain.todo import Todo


class TestTodoCreate:
    """Todo.create() factory method — TDD plan cases."""

    def test_create_returns_active_status(self) -> None:
        todo = Todo.create(TodoTitle("Buy milk"))
        assert todo.status is TodoStatus.ACTIVE

    def test_create_assigns_non_null_todo_id(self) -> None:
        todo = Todo.create(TodoTitle("Buy milk"))
        assert todo.id is not None
        assert todo.id.value

    def test_create_emits_exactly_one_todo_created_event(self) -> None:
        todo = Todo.create(TodoTitle("Buy milk"))
        events = todo.pull_events()
        assert len(events) == 1
        assert isinstance(events[0], TodoCreated)

    def test_todo_created_event_carries_correct_todo_id(self) -> None:
        todo = Todo.create(TodoTitle("Buy milk"))
        events = todo.pull_events()
        assert events[0].todo_id == todo.id

    def test_todo_created_event_carries_title(self) -> None:
        title = TodoTitle("Buy milk")
        todo = Todo.create(title)
        events = todo.pull_events()
        assert events[0].title == title

    def test_create_raises_invalid_title_error_on_blank_title(self) -> None:
        with pytest.raises(InvalidTitleError):
            Todo.create(TodoTitle(""))  # TodoTitle itself validates

    def test_create_title_is_stored(self) -> None:
        title = TodoTitle("Buy milk")
        todo = Todo.create(title)
        assert todo.title == title

    def test_create_sets_created_at_and_updated_at(self) -> None:
        todo = Todo.create(TodoTitle("Buy milk"))
        assert todo.created_at is not None
        assert todo.updated_at is not None
        assert todo.created_at == todo.updated_at

    def test_pull_events_drains_the_list(self) -> None:
        todo = Todo.create(TodoTitle("Buy milk"))
        first_pull = todo.pull_events()
        second_pull = todo.pull_events()
        assert len(first_pull) == 1
        assert len(second_pull) == 0


class TestTodoComplete:
    """todo.complete() command method."""

    def test_complete_transitions_active_to_completed(self) -> None:
        todo = Todo.create(TodoTitle("Buy milk"))
        todo.pull_events()  # drain create event
        todo.complete()
        assert todo.status is TodoStatus.COMPLETED

    def test_complete_emits_todo_completed_event(self) -> None:
        todo = Todo.create(TodoTitle("Buy milk"))
        todo.pull_events()
        todo.complete()
        events = todo.pull_events()
        assert len(events) == 1
        assert isinstance(events[0], TodoCompleted)

    def test_complete_event_carries_todo_id(self) -> None:
        todo = Todo.create(TodoTitle("Buy milk"))
        todo.pull_events()
        todo.complete()
        events = todo.pull_events()
        assert events[0].todo_id == todo.id

    def test_complete_updates_updated_at(self) -> None:
        import time
        todo = Todo.create(TodoTitle("Buy milk"))
        original_updated_at = todo.updated_at
        todo.pull_events()
        # Sleep briefly to guarantee clock advances before the next Timestamp.now() call.
        time.sleep(0.01)
        todo.complete()
        assert todo.updated_at != original_updated_at

    def test_complete_on_already_completed_is_no_op(self) -> None:
        todo = Todo.create(TodoTitle("Buy milk"))
        todo.pull_events()
        todo.complete()
        todo.pull_events()  # drain first complete event
        # Second complete — must be idempotent
        todo.complete()
        events = todo.pull_events()
        assert len(events) == 0
        assert todo.status is TodoStatus.COMPLETED

    def test_complete_on_already_completed_does_not_change_status(self) -> None:
        todo = Todo.create(TodoTitle("Buy milk"))
        todo.pull_events()
        todo.complete()
        todo.pull_events()
        todo.complete()
        # Still completed, no exception
        assert todo.status is TodoStatus.COMPLETED


class TestTodoReopen:
    """todo.reopen() command method."""

    def _completed_todo(self) -> Todo:
        todo = Todo.create(TodoTitle("Buy milk"))
        todo.pull_events()
        todo.complete()
        todo.pull_events()
        return todo

    def test_reopen_transitions_completed_to_active(self) -> None:
        todo = self._completed_todo()
        todo.reopen()
        assert todo.status is TodoStatus.ACTIVE

    def test_reopen_emits_todo_reopened_event(self) -> None:
        todo = self._completed_todo()
        todo.reopen()
        events = todo.pull_events()
        assert len(events) == 1
        assert isinstance(events[0], TodoReopened)

    def test_reopen_event_carries_todo_id(self) -> None:
        todo = self._completed_todo()
        todo.reopen()
        events = todo.pull_events()
        assert events[0].todo_id == todo.id

    def test_reopen_on_already_active_is_no_op(self) -> None:
        todo = Todo.create(TodoTitle("Buy milk"))
        todo.pull_events()
        # Already active — reopen must be idempotent
        todo.reopen()
        events = todo.pull_events()
        assert len(events) == 0
        assert todo.status is TodoStatus.ACTIVE

    def test_reopen_on_already_active_does_not_change_status(self) -> None:
        todo = Todo.create(TodoTitle("Buy milk"))
        todo.pull_events()
        todo.reopen()
        assert todo.status is TodoStatus.ACTIVE


class TestTodoUpdateTitle:
    """todo.update_title() command method."""

    def test_update_title_changes_the_title(self) -> None:
        todo = Todo.create(TodoTitle("Buy milk"))
        todo.pull_events()
        new_title = TodoTitle("Buy oat milk")
        todo.update_title(new_title)
        assert todo.title == new_title

    def test_update_title_emits_todo_title_updated_event(self) -> None:
        todo = Todo.create(TodoTitle("Buy milk"))
        todo.pull_events()
        todo.update_title(TodoTitle("Buy oat milk"))
        events = todo.pull_events()
        assert len(events) == 1
        assert isinstance(events[0], TodoTitleUpdated)

    def test_update_title_event_carries_new_title(self) -> None:
        todo = Todo.create(TodoTitle("Buy milk"))
        todo.pull_events()
        new_title = TodoTitle("Buy oat milk")
        todo.update_title(new_title)
        events = todo.pull_events()
        assert events[0].new_title == new_title

    def test_update_title_event_carries_todo_id(self) -> None:
        todo = Todo.create(TodoTitle("Buy milk"))
        todo.pull_events()
        todo.update_title(TodoTitle("Buy oat milk"))
        events = todo.pull_events()
        assert events[0].todo_id == todo.id

    def test_update_title_raises_invalid_title_error_on_blank(self) -> None:
        todo = Todo.create(TodoTitle("Buy milk"))
        todo.pull_events()
        with pytest.raises(InvalidTitleError):
            todo.update_title(TodoTitle("   "))  # TodoTitle validates before reaching aggregate

    def test_original_title_unchanged_after_failed_update(self) -> None:
        original = TodoTitle("Buy milk")
        todo = Todo.create(original)
        todo.pull_events()
        try:
            todo.update_title(TodoTitle(""))
        except (InvalidTitleError, Exception):
            pass
        assert todo.title == original


class TestTodoDelete:
    """todo.delete() command method."""

    def test_delete_emits_todo_deleted_event(self) -> None:
        todo = Todo.create(TodoTitle("Buy milk"))
        todo.pull_events()
        todo.delete()
        events = todo.pull_events()
        assert len(events) == 1
        assert isinstance(events[0], TodoDeleted)

    def test_delete_event_carries_todo_id(self) -> None:
        todo = Todo.create(TodoTitle("Buy milk"))
        todo.pull_events()
        todo.delete()
        events = todo.pull_events()
        assert events[0].todo_id == todo.id


class TestTodoReconstitute:
    """Todo.reconstitute() must NOT emit events (loading from storage)."""

    def test_reconstitute_does_not_emit_events(self) -> None:
        from todo.domain.value_objects import TodoId, Timestamp
        todo = Todo.reconstitute(
            id=TodoId.generate(),
            title=TodoTitle("Buy milk"),
            status=TodoStatus.ACTIVE,
            created_at=Timestamp.now(),
            updated_at=Timestamp.now(),
        )
        events = todo.pull_events()
        assert len(events) == 0

    def test_reconstitute_restores_all_fields(self) -> None:
        from todo.domain.value_objects import TodoId, Timestamp
        todo_id = TodoId.generate()
        title = TodoTitle("Buy milk")
        status = TodoStatus.COMPLETED
        created_at = Timestamp("2026-01-01T00:00:00+00:00")
        updated_at = Timestamp("2026-01-02T00:00:00+00:00")

        todo = Todo.reconstitute(
            id=todo_id,
            title=title,
            status=status,
            created_at=created_at,
            updated_at=updated_at,
        )

        assert todo.id == todo_id
        assert todo.title == title
        assert todo.status is status
        assert todo.created_at == created_at
        assert todo.updated_at == updated_at

    def test_repr_contains_id_title_status(self) -> None:
        from todo.domain.value_objects import TodoId, Timestamp
        todo = Todo.reconstitute(
            id=TodoId.of("test-id"),
            title=TodoTitle("Buy milk"),
            status=TodoStatus.ACTIVE,
            created_at=Timestamp.now(),
            updated_at=Timestamp.now(),
        )
        r = repr(todo)
        assert "test-id" in r
        assert "Buy milk" in r
        assert "active" in r
