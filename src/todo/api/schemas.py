"""Pydantic schemas for the Todo REST API.

These are the request and response shapes for the Application Layer.
They translate between external JSON representations and Domain objects.
No business rules live here.

All field names match the spec's Resource Representation verbatim (camelCase).
"""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, field_validator

from todo.domain.todo import Todo

# Error code constants — kept here so callers never hardcode strings.
ERROR_TODO_NOT_FOUND = "TODO_NOT_FOUND"
ERROR_INVALID_TITLE = "INVALID_TITLE"
ERROR_BAD_REQUEST = "BAD_REQUEST"
ERROR_INTERNAL_ERROR = "INTERNAL_ERROR"

# Valid filter parameter values (mirrors FilterCriteria without importing the enum
# into the HTTP layer's validation path).
VALID_FILTER_VALUES = {"all", "active", "completed"}

# Valid status values for PATCH requests.
VALID_STATUS_VALUES = {"active", "completed"}


class TodoResource(BaseModel):
    """The canonical JSON representation of a Todo, as per the spec."""

    id: str
    title: str
    status: Literal["active", "completed"]
    createdAt: str
    updatedAt: str

    @classmethod
    def from_domain(cls, todo: Todo) -> TodoResource:
        """Convert a Todo domain object to a TodoResource response."""
        return cls(
            id=todo.id.value,
            title=todo.title.value,
            status=todo.status.value,
            createdAt=todo.created_at.value,
            updatedAt=todo.updated_at.value,
        )


class CountsResource(BaseModel):
    """Aggregate counts returned alongside the todo list."""

    all: int
    active: int
    completed: int


class ListTodosResponse(BaseModel):
    """Response body for GET /api/todos."""

    todos: list[TodoResource]
    counts: CountsResource


class CreateTodoRequest(BaseModel):
    """Request body for POST /api/todos."""

    title: str


class PatchTodoRequest(BaseModel):
    """Request body for PATCH /api/todos/:id.

    Both fields are optional; each independently triggers a domain command.
    """

    title: Optional[str] = None
    status: Optional[Literal["active", "completed"]] = None


class ErrorResponse(BaseModel):
    """Standard error envelope for all 4xx/5xx responses."""

    error: str
    message: str


class DeleteCompletedResponse(BaseModel):
    """Response body for DELETE /api/todos?status=completed."""

    deletedCount: int
