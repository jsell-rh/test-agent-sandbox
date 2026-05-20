"""Tests for domain Value Objects.

Covers the critical TDD cases from the domain-model spec for ``TodoTitle``.
All tests exercise observable behaviour of the value object itself with no
persistence or HTTP concerns.
"""

from __future__ import annotations

import pytest

from todo.domain.errors import InvalidTitleError
from todo.domain.value_objects import TODO_TITLE_MAX_LENGTH, TodoTitle


# ---------------------------------------------------------------------------
# TodoTitle
# ---------------------------------------------------------------------------


class TestTodoTitle:
    """Invariant enforcement and normalisation for TodoTitle."""

    # -- Rejection cases ---------------------------------------------------

    def test_blank_string_raises_invalid_title_error(self) -> None:
        with pytest.raises(InvalidTitleError):
            TodoTitle("")

    def test_whitespace_only_string_raises_invalid_title_error(self) -> None:
        with pytest.raises(InvalidTitleError):
            TodoTitle("   ")

    def test_tab_only_string_raises_invalid_title_error(self) -> None:
        with pytest.raises(InvalidTitleError):
            TodoTitle("\t\n")

    def test_string_exceeding_max_length_raises_invalid_title_error(self) -> None:
        too_long = "x" * (TODO_TITLE_MAX_LENGTH + 1)
        with pytest.raises(InvalidTitleError):
            TodoTitle(too_long)

    # -- Acceptance cases --------------------------------------------------

    def test_string_at_max_length_is_valid(self) -> None:
        at_limit = "x" * TODO_TITLE_MAX_LENGTH
        title = TodoTitle(at_limit)
        assert len(title.value) == TODO_TITLE_MAX_LENGTH

    def test_normal_string_is_accepted(self) -> None:
        title = TodoTitle("Buy milk")
        assert title.value == "Buy milk"

    # -- Whitespace trimming -----------------------------------------------

    def test_leading_whitespace_is_trimmed(self) -> None:
        title = TodoTitle("  Buy milk")
        assert title.value == "Buy milk"

    def test_trailing_whitespace_is_trimmed(self) -> None:
        title = TodoTitle("Buy milk  ")
        assert title.value == "Buy milk"

    def test_both_sides_whitespace_trimmed(self) -> None:
        title = TodoTitle("  Buy milk  ")
        assert title.value == "Buy milk"

    def test_trimming_happens_before_length_validation(self) -> None:
        """A string that is valid after trimming must not be rejected.

        A raw string of (MAX + 2) chars with one leading and one trailing
        space trims to exactly MAX chars — it must be accepted.
        """
        padded = " " + "x" * TODO_TITLE_MAX_LENGTH + " "
        title = TodoTitle(padded)
        assert len(title.value) == TODO_TITLE_MAX_LENGTH

    # -- Equality ----------------------------------------------------------

    def test_titles_with_same_value_are_equal(self) -> None:
        assert TodoTitle("Buy milk") == TodoTitle("Buy milk")

    def test_titles_with_different_values_are_not_equal(self) -> None:
        assert TodoTitle("Buy milk") != TodoTitle("Buy eggs")

    def test_equality_is_case_sensitive(self) -> None:
        assert TodoTitle("buy milk") != TodoTitle("Buy milk")
