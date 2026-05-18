"""Domain errors for the Todo bounded context."""

from __future__ import annotations


class InvalidTitleError(ValueError):
    """Raised when a TodoTitle is blank or exceeds the maximum allowed length."""


class TodoNotFoundError(Exception):
    """Raised when a TodoId references a non-existent Todo."""

    def __init__(self, todo_id: str) -> None:
        super().__init__(f"Todo not found: {todo_id!r}")
        self.todo_id = todo_id
