"""Domain value-object tests for the Todo bounded context.

Covers the TDD Plan cases from specs/domain-model.spec.md:

TodoTitle invariants
  - Blank string raises InvalidTitleError
  - Whitespace-only string raises InvalidTitleError
  - 500-character string is valid (boundary)
  - 501-character string raises InvalidTitleError (boundary + 1)
  - Leading/trailing whitespace is trimmed before validation and storage

TodoId
  - Generated id is a valid UUID v4 string
  - Two generated ids are distinct
  - Equality is by value, not reference

FilterCriteria / TodoStatus
  - Default FilterCriteria is ALL
  - Enum members round-trip through their string values

Timestamp
  - now() returns an ISO 8601 UTC value
  - Equality is by value
"""

from __future__ import annotations

import re
import uuid

import pytest

from todo.domain.errors import InvalidTitleError
from todo.domain.value_objects import (
    TODO_TITLE_MAX_LENGTH,
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
    """Invariants for the TodoTitle value object."""

    # --- validation failures -----------------------------------------------

    def test_blank_string_raises_invalid_title_error(self) -> None:
        with pytest.raises(InvalidTitleError):
            TodoTitle("")

    def test_whitespace_only_string_raises_invalid_title_error(self) -> None:
        with pytest.raises(InvalidTitleError):
            TodoTitle("   ")

    def test_tab_only_string_raises_invalid_title_error(self) -> None:
        with pytest.raises(InvalidTitleError):
            TodoTitle("\t\n")

    def test_max_length_string_is_valid(self) -> None:
        title = TodoTitle("a" * TODO_TITLE_MAX_LENGTH)
        assert len(title.value) == TODO_TITLE_MAX_LENGTH

    def test_exceeding_max_length_raises_invalid_title_error(self) -> None:
        with pytest.raises(InvalidTitleError):
            TodoTitle("a" * (TODO_TITLE_MAX_LENGTH + 1))

    def test_exactly_one_over_max_length_raises(self) -> None:
        """501-character string is rejected (boundary + 1)."""
        with pytest.raises(InvalidTitleError):
            TodoTitle("x" * 501)

    # --- trimming ----------------------------------------------------------

    def test_leading_whitespace_is_trimmed(self) -> None:
        title = TodoTitle("   hello")
        assert title.value == "hello"

    def test_trailing_whitespace_is_trimmed(self) -> None:
        title = TodoTitle("hello   ")
        assert title.value == "hello"

    def test_both_sides_whitespace_trimmed(self) -> None:
        title = TodoTitle("  Buy milk  ")
        assert title.value == "Buy milk"

    def test_trimmed_length_must_not_exceed_max(self) -> None:
        """A string whose trimmed length is 501 chars is still rejected."""
        with pytest.raises(InvalidTitleError):
            TodoTitle("  " + "a" * (TODO_TITLE_MAX_LENGTH + 1) + "  ")

    def test_whitespace_trimmed_to_empty_raises(self) -> None:
        """Whitespace that trims to empty is still rejected."""
        with pytest.raises(InvalidTitleError):
            TodoTitle("  \n  ")

    # --- equality ----------------------------------------------------------

    def test_equality_by_value(self) -> None:
        a = TodoTitle("Buy milk")
        b = TodoTitle("Buy milk")
        assert a == b

    def test_case_sensitive_equality(self) -> None:
        assert TodoTitle("Buy Milk") != TodoTitle("buy milk")

    def test_immutability_frozen_dataclass(self) -> None:
        title = TodoTitle("Buy milk")
        with pytest.raises((AttributeError, TypeError)):
            title.value = "something else"  # type: ignore[misc]


# ---------------------------------------------------------------------------
# TodoId
# ---------------------------------------------------------------------------


_UUID4_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
)


class TestTodoId:
    """Invariants for the TodoId value object."""

    def test_generate_produces_uuid4_string(self) -> None:
        todo_id = TodoId.generate()
        assert _UUID4_RE.match(todo_id.value), f"Not a UUID v4: {todo_id.value!r}"

    def test_two_generated_ids_are_distinct(self) -> None:
        assert TodoId.generate() != TodoId.generate()

    def test_equality_by_value(self) -> None:
        raw = str(uuid.uuid4())
        a = TodoId(raw)
        b = TodoId(raw)
        assert a == b

    def test_immutability_frozen_dataclass(self) -> None:
        todo_id = TodoId.generate()
        with pytest.raises((AttributeError, TypeError)):
            todo_id.value = "new"  # type: ignore[misc]


# ---------------------------------------------------------------------------
# TodoStatus
# ---------------------------------------------------------------------------


class TestTodoStatus:
    """Enumeration values for TodoStatus."""

    def test_active_value(self) -> None:
        assert TodoStatus.ACTIVE == "active"

    def test_completed_value(self) -> None:
        assert TodoStatus.COMPLETED == "completed"

    def test_only_two_members(self) -> None:
        assert set(TodoStatus) == {TodoStatus.ACTIVE, TodoStatus.COMPLETED}


# ---------------------------------------------------------------------------
# FilterCriteria
# ---------------------------------------------------------------------------


class TestFilterCriteria:
    """FilterCriteria default and enumeration behaviour."""

    def test_all_is_default(self) -> None:
        assert FilterCriteria.ALL == "all"

    def test_active_value(self) -> None:
        assert FilterCriteria.ACTIVE == "active"

    def test_completed_value(self) -> None:
        assert FilterCriteria.COMPLETED == "completed"

    def test_three_members(self) -> None:
        assert set(FilterCriteria) == {
            FilterCriteria.ALL,
            FilterCriteria.ACTIVE,
            FilterCriteria.COMPLETED,
        }


# ---------------------------------------------------------------------------
# Timestamp
# ---------------------------------------------------------------------------


class TestTimestamp:
    """Invariants for the Timestamp value object."""

    _ISO8601_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}")

    def test_now_produces_iso8601_string(self) -> None:
        ts = Timestamp.now()
        assert self._ISO8601_RE.match(ts.value), f"Not ISO 8601: {ts.value!r}"

    def test_now_is_utc(self) -> None:
        ts = Timestamp.now()
        # Python datetime.isoformat() appends '+00:00' for UTC-aware datetimes.
        assert "+00:00" in ts.value or ts.value.endswith("Z")

    def test_equality_by_value(self) -> None:
        raw = "2024-01-01T00:00:00+00:00"
        assert Timestamp(raw) == Timestamp(raw)

    def test_different_strings_not_equal(self) -> None:
        assert Timestamp.now() != Timestamp("2000-01-01T00:00:00+00:00")

    def test_immutability_frozen_dataclass(self) -> None:
        ts = Timestamp.now()
        with pytest.raises((AttributeError, TypeError)):
            ts.value = "bad"  # type: ignore[misc]
