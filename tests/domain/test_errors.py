"""Tests for domain error types."""

from __future__ import annotations

import pytest

from todo.domain.errors import InvalidTitleError, TodoNotFoundError


class TestInvalidTitleError:
    def test_is_value_error(self) -> None:
        assert issubclass(InvalidTitleError, ValueError)

    def test_carries_message(self) -> None:
        err = InvalidTitleError("title is blank")
        assert "title is blank" in str(err)


class TestTodoNotFoundError:
    def test_carries_todo_id(self) -> None:
        err = TodoNotFoundError("abc-123")
        assert err.todo_id == "abc-123"

    def test_message_includes_id(self) -> None:
        err = TodoNotFoundError("abc-123")
        assert "abc-123" in str(err)

    def test_is_exception(self) -> None:
        assert issubclass(TodoNotFoundError, Exception)
