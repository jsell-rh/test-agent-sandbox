"""Tests for Todo domain value objects."""

from __future__ import annotations

import pytest

from todo.domain.errors import InvalidTitleError
from todo.domain.value_objects import (
    FilterCriteria,
    Timestamp,
    TodoId,
    TodoStatus,
    TodoTitle,
    TODO_TITLE_MAX_LENGTH,
)


class TestTodoTitle:
    """TodoTitle invariants as specified in the TDD plan."""

    def test_blank_string_raises_invalid_title_error(self) -> None:
        with pytest.raises(InvalidTitleError):
            TodoTitle("")

    def test_whitespace_only_raises_invalid_title_error(self) -> None:
        with pytest.raises(InvalidTitleError):
            TodoTitle("   ")

    def test_tab_only_raises_invalid_title_error(self) -> None:
        with pytest.raises(InvalidTitleError):
            TodoTitle("\t\n")

    def test_max_length_string_is_valid(self) -> None:
        title = TodoTitle("a" * TODO_TITLE_MAX_LENGTH)
        assert len(title.value) == TODO_TITLE_MAX_LENGTH

    def test_exceeds_max_length_raises_invalid_title_error(self) -> None:
        with pytest.raises(InvalidTitleError):
            TodoTitle("a" * (TODO_TITLE_MAX_LENGTH + 1))

    def test_leading_trailing_whitespace_is_trimmed(self) -> None:
        title = TodoTitle("  hello world  ")
        assert title.value == "hello world"

    def test_trimming_happens_before_validation(self) -> None:
        # "  a  " trimmed is "a" — valid; should NOT raise
        title = TodoTitle("  a  ")
        assert title.value == "a"

    def test_whitespace_padding_on_max_length_is_still_valid(self) -> None:
        raw = "  " + "a" * TODO_TITLE_MAX_LENGTH + "  "
        title = TodoTitle(raw)
        assert len(title.value) == TODO_TITLE_MAX_LENGTH

    def test_equality_is_by_value(self) -> None:
        t1 = TodoTitle("Buy milk")
        t2 = TodoTitle("Buy milk")
        assert t1 == t2

    def test_case_sensitive_equality(self) -> None:
        assert TodoTitle("Buy milk") != TodoTitle("buy milk")

    def test_immutability(self) -> None:
        title = TodoTitle("original")
        with pytest.raises(Exception):
            title.value = "mutated"  # type: ignore[misc]

    def test_str_returns_value(self) -> None:
        title = TodoTitle("Buy milk")
        assert str(title) == "Buy milk"


class TestTodoId:
    """TodoId value object."""

    def test_empty_string_raises_value_error(self) -> None:
        with pytest.raises(ValueError):
            TodoId.of("")

    def test_generate_returns_non_empty_id(self) -> None:
        todo_id = TodoId.generate()
        assert todo_id.value

    def test_generate_returns_unique_ids(self) -> None:
        id1 = TodoId.generate()
        id2 = TodoId.generate()
        assert id1 != id2

    def test_generate_produces_uuid_v4_format(self) -> None:
        import uuid
        todo_id = TodoId.generate()
        parsed = uuid.UUID(todo_id.value, version=4)
        assert str(parsed) == todo_id.value

    def test_equality_is_by_value(self) -> None:
        id1 = TodoId.of("abc-123")
        id2 = TodoId.of("abc-123")
        assert id1 == id2

    def test_different_values_are_not_equal(self) -> None:
        assert TodoId.of("aaa") != TodoId.of("bbb")

    def test_str_returns_value(self) -> None:
        todo_id = TodoId.of("my-id")
        assert str(todo_id) == "my-id"


class TestTodoStatus:
    """TodoStatus enumeration."""

    def test_active_value(self) -> None:
        assert TodoStatus.ACTIVE.value == "active"

    def test_completed_value(self) -> None:
        assert TodoStatus.COMPLETED.value == "completed"

    def test_only_two_states(self) -> None:
        assert set(TodoStatus) == {TodoStatus.ACTIVE, TodoStatus.COMPLETED}


class TestFilterCriteria:
    """FilterCriteria enumeration."""

    def test_all_value(self) -> None:
        assert FilterCriteria.ALL.value == "all"

    def test_active_value(self) -> None:
        assert FilterCriteria.ACTIVE.value == "active"

    def test_completed_value(self) -> None:
        assert FilterCriteria.COMPLETED.value == "completed"

    def test_default_is_all(self) -> None:
        assert FilterCriteria.ALL == FilterCriteria("all")

    def test_three_criteria(self) -> None:
        assert set(FilterCriteria) == {
            FilterCriteria.ALL,
            FilterCriteria.ACTIVE,
            FilterCriteria.COMPLETED,
        }


class TestTimestamp:
    """Timestamp value object."""

    def test_now_returns_iso8601_string(self) -> None:
        from datetime import datetime
        ts = Timestamp.now()
        # Must be parseable as UTC datetime
        parsed = datetime.fromisoformat(ts.value)
        assert parsed is not None

    def test_equality_by_value(self) -> None:
        ts1 = Timestamp("2026-01-01T00:00:00+00:00")
        ts2 = Timestamp("2026-01-01T00:00:00+00:00")
        assert ts1 == ts2

    def test_different_values_not_equal(self) -> None:
        assert Timestamp("2026-01-01T00:00:00+00:00") != Timestamp(
            "2026-01-02T00:00:00+00:00"
        )

    def test_str_returns_value(self) -> None:
        value = "2026-01-01T00:00:00+00:00"
        assert str(Timestamp(value)) == value
