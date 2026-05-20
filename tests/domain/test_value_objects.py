"""Tests for domain value objects — written first per TDD discipline."""
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

    def test_tab_only_string_raises_invalid_title_error(self):
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

    def test_trimmed_title_that_becomes_blank_raises_error(self):
        with pytest.raises(InvalidTitleError):
            TodoTitle("   ")

    def test_equality_by_value(self):
        t1 = TodoTitle("Buy milk")
        t2 = TodoTitle("Buy milk")
        assert t1 == t2

    def test_inequality_case_sensitive(self):
        assert TodoTitle("Buy milk") != TodoTitle("buy milk")

    def test_title_is_immutable(self):
        title = TodoTitle("Buy milk")
        with pytest.raises((AttributeError, TypeError)):
            title.value = "something else"  # type: ignore[misc]

    def test_str_returns_value(self):
        title = TodoTitle("Buy milk")
        assert str(title) == "Buy milk"


# ---------------------------------------------------------------------------
# TodoId
# ---------------------------------------------------------------------------


class TestTodoId:
    def test_generate_returns_uuid_v4_string(self):
        import re

        todo_id = TodoId.generate()
        uuid4_pattern = re.compile(
            r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
            re.IGNORECASE,
        )
        assert uuid4_pattern.match(todo_id.value)

    def test_generate_produces_unique_ids(self):
        id1 = TodoId.generate()
        id2 = TodoId.generate()
        assert id1 != id2

    def test_equality_by_value(self):
        id1 = TodoId("00000000-0000-4000-8000-000000000001")
        id2 = TodoId("00000000-0000-4000-8000-000000000001")
        assert id1 == id2

    def test_inequality_different_values(self):
        id1 = TodoId("00000000-0000-4000-8000-000000000001")
        id2 = TodoId("00000000-0000-4000-8000-000000000002")
        assert id1 != id2

    def test_id_is_immutable(self):
        todo_id = TodoId.generate()
        with pytest.raises((AttributeError, TypeError)):
            todo_id.value = "other"  # type: ignore[misc]

    def test_str_returns_value(self):
        raw = "00000000-0000-4000-8000-000000000001"
        assert str(TodoId(raw)) == raw


# ---------------------------------------------------------------------------
# TodoStatus
# ---------------------------------------------------------------------------


class TestTodoStatus:
    def test_active_value(self):
        assert TodoStatus.ACTIVE.value == "active"

    def test_completed_value(self):
        assert TodoStatus.COMPLETED.value == "completed"


# ---------------------------------------------------------------------------
# FilterCriteria
# ---------------------------------------------------------------------------


class TestFilterCriteria:
    def test_default_is_all(self):
        assert FilterCriteria.default() == FilterCriteria.ALL

    def test_all_value(self):
        assert FilterCriteria.ALL.value == "all"

    def test_active_value(self):
        assert FilterCriteria.ACTIVE.value == "active"

    def test_completed_value(self):
        assert FilterCriteria.COMPLETED.value == "completed"


# ---------------------------------------------------------------------------
# Timestamp
# ---------------------------------------------------------------------------


class TestTimestamp:
    def test_now_returns_iso8601_string(self):
        ts = Timestamp.now()
        # Should be parseable as a datetime
        from datetime import datetime

        dt = datetime.fromisoformat(ts.value)
        assert dt is not None

    def test_equality_by_value(self):
        ts1 = Timestamp("2026-05-20T00:00:00+00:00")
        ts2 = Timestamp("2026-05-20T00:00:00+00:00")
        assert ts1 == ts2

    def test_inequality_different_values(self):
        ts1 = Timestamp("2026-05-20T00:00:00+00:00")
        ts2 = Timestamp("2026-05-21T00:00:00+00:00")
        assert ts1 != ts2

    def test_timestamp_is_immutable(self):
        ts = Timestamp.now()
        with pytest.raises((AttributeError, TypeError)):
            ts.value = "other"  # type: ignore[misc]
