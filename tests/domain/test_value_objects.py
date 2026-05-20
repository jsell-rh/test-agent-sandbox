"""Tests for domain value objects — written first per TDD discipline.

Covers: TodoId, TodoTitle, TodoStatus, FilterCriteria, Timestamp
and the domain errors they raise.
"""
import re
from datetime import datetime

import pytest

from todo.domain.errors import InvalidTitleError
from todo.domain.value_objects import (
    TITLE_MAX_LENGTH,
    FilterCriteria,
    Timestamp,
    TodoId,
    TodoStatus,
    TodoTitle,
)


# ---------------------------------------------------------------------------
# TodoTitle
# ---------------------------------------------------------------------------


class TestTodoTitle:
    def test_blank_string_raises_invalid_title_error(self):
        with pytest.raises(InvalidTitleError):
            TodoTitle("")

    def test_whitespace_only_string_raises_invalid_title_error(self):
        with pytest.raises(InvalidTitleError):
            TodoTitle("   ")

    def test_tab_and_newline_only_raises_invalid_title_error(self):
        with pytest.raises(InvalidTitleError):
            TodoTitle("\t\n ")

    def test_500_character_string_is_valid(self):
        title = TodoTitle("a" * TITLE_MAX_LENGTH)
        assert len(title.value) == TITLE_MAX_LENGTH

    def test_501_character_string_raises_invalid_title_error(self):
        with pytest.raises(InvalidTitleError):
            TodoTitle("a" * (TITLE_MAX_LENGTH + 1))

    def test_leading_trailing_whitespace_is_trimmed(self):
        title = TodoTitle("  hello  ")
        assert title.value == "hello"

    def test_whitespace_trimmed_then_blank_raises_error(self):
        """Leading/trailing whitespace is stripped before validation."""
        with pytest.raises(InvalidTitleError):
            TodoTitle("   ")

    def test_equality_is_by_value(self):
        assert TodoTitle("Buy milk") == TodoTitle("Buy milk")

    def test_inequality_is_case_sensitive(self):
        assert TodoTitle("Buy milk") != TodoTitle("buy milk")

    def test_title_is_immutable(self):
        title = TodoTitle("Buy milk")
        with pytest.raises((AttributeError, TypeError)):
            title.value = "something else"  # type: ignore[misc]

    def test_str_returns_the_raw_value(self):
        assert str(TodoTitle("Buy milk")) == "Buy milk"

    def test_trimmed_value_stored_not_original(self):
        """After trimming, the stored value matches the trimmed form."""
        title = TodoTitle("  hello world  ")
        assert title.value == "hello world"

    def test_500_char_after_trim_is_valid(self):
        """500 characters after leading whitespace is stripped is valid."""
        padded = " " + "a" * TITLE_MAX_LENGTH + " "
        title = TodoTitle(padded)
        assert len(title.value) == TITLE_MAX_LENGTH


# ---------------------------------------------------------------------------
# TodoId
# ---------------------------------------------------------------------------


UUID4_PATTERN = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


class TestTodoId:
    def test_generate_returns_uuid_v4_string(self):
        todo_id = TodoId.generate()
        assert UUID4_PATTERN.match(todo_id.value)

    def test_generate_produces_unique_ids(self):
        assert TodoId.generate() != TodoId.generate()

    def test_equality_is_by_value(self):
        fixed = "00000000-0000-4000-8000-000000000001"
        assert TodoId(fixed) == TodoId(fixed)

    def test_inequality_for_different_values(self):
        assert TodoId("00000000-0000-4000-8000-000000000001") != TodoId(
            "00000000-0000-4000-8000-000000000002"
        )

    def test_id_is_immutable(self):
        todo_id = TodoId.generate()
        with pytest.raises((AttributeError, TypeError)):
            todo_id.value = "other"  # type: ignore[misc]

    def test_str_returns_the_raw_value(self):
        raw = "00000000-0000-4000-8000-000000000001"
        assert str(TodoId(raw)) == raw


# ---------------------------------------------------------------------------
# TodoStatus
# ---------------------------------------------------------------------------


class TestTodoStatus:
    def test_active_value_is_active_string(self):
        assert TodoStatus.ACTIVE.value == "active"

    def test_completed_value_is_completed_string(self):
        assert TodoStatus.COMPLETED.value == "completed"

    def test_only_two_members(self):
        assert set(TodoStatus) == {TodoStatus.ACTIVE, TodoStatus.COMPLETED}


# ---------------------------------------------------------------------------
# FilterCriteria
# ---------------------------------------------------------------------------


class TestFilterCriteria:
    def test_default_is_all(self):
        assert FilterCriteria.default() == FilterCriteria.ALL

    def test_all_value_is_all_string(self):
        assert FilterCriteria.ALL.value == "all"

    def test_active_value_is_active_string(self):
        assert FilterCriteria.ACTIVE.value == "active"

    def test_completed_value_is_completed_string(self):
        assert FilterCriteria.COMPLETED.value == "completed"

    def test_three_members(self):
        assert set(FilterCriteria) == {
            FilterCriteria.ALL,
            FilterCriteria.ACTIVE,
            FilterCriteria.COMPLETED,
        }


# ---------------------------------------------------------------------------
# Timestamp
# ---------------------------------------------------------------------------


class TestTimestamp:
    def test_now_returns_parseable_iso8601_string(self):
        ts = Timestamp.now()
        dt = datetime.fromisoformat(ts.value)
        assert dt is not None

    def test_equality_is_by_value(self):
        ts1 = Timestamp("2026-05-20T00:00:00+00:00")
        ts2 = Timestamp("2026-05-20T00:00:00+00:00")
        assert ts1 == ts2

    def test_inequality_for_different_values(self):
        assert Timestamp("2026-05-20T00:00:00+00:00") != Timestamp(
            "2026-05-21T00:00:00+00:00"
        )

    def test_timestamp_is_immutable(self):
        ts = Timestamp.now()
        with pytest.raises((AttributeError, TypeError)):
            ts.value = "other"  # type: ignore[misc]

    def test_str_returns_the_raw_value(self):
        raw = "2026-05-20T00:00:00+00:00"
        assert str(Timestamp(raw)) == raw
