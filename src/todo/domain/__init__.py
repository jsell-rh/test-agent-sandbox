"""Todo domain package — public surface area.

Import everything you need from ``todo.domain`` rather than from sub-modules
to insulate callers from internal file layout changes.
"""
from todo.domain.errors import InvalidTitleError, TodoNotFoundError
from todo.domain.events import (
    TodoCompleted,
    TodoCreated,
    TodoDeleted,
    TodoReopened,
    TodoTitleUpdated,
)
from todo.domain.repository import TodoRepository
from todo.domain.todo import Todo
from todo.domain.value_objects import (
    TITLE_MAX_LENGTH,
    FilterCriteria,
    Timestamp,
    TodoId,
    TodoStatus,
    TodoTitle,
)

__all__ = [
    # Aggregate
    "Todo",
    # Value Objects
    "FilterCriteria",
    "Timestamp",
    "TodoId",
    "TodoStatus",
    "TodoTitle",
    "TITLE_MAX_LENGTH",
    # Events
    "TodoCompleted",
    "TodoCreated",
    "TodoDeleted",
    "TodoReopened",
    "TodoTitleUpdated",
    # Errors
    "InvalidTitleError",
    "TodoNotFoundError",
    # Repository interface
    "TodoRepository",
]
