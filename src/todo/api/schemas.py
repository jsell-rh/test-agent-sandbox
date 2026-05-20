"""Pydantic request/response schemas for the Todo REST API.

All field names in JSON responses use camelCase as specified.  Python
attribute names use snake_case internally; the ``model_config`` / ``alias``
settings handle the translation automatically.

No business logic lives here — schemas are pure data-transfer containers.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class TodoResponse(BaseModel):
    """JSON representation of a single Todo resource."""

    model_config = ConfigDict(populate_by_name=True)

    id: str
    title: str
    status: str  # "active" | "completed"
    createdAt: str
    updatedAt: str


class TodoCountsResponse(BaseModel):
    """Counts of todos broken down by status."""

    all: int
    active: int
    completed: int


class TodoListResponse(BaseModel):
    """Response body for GET /api/todos."""

    todos: list[TodoResponse]
    counts: TodoCountsResponse


class DeletedCountResponse(BaseModel):
    """Response body for DELETE /api/todos?status=completed."""

    deletedCount: int


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class CreateTodoRequest(BaseModel):
    """Request body for POST /api/todos."""

    title: str


class UpdateTodoRequest(BaseModel):
    """Request body for PATCH /api/todos/:id.

    All fields are optional — callers may supply title, status, or both.
    """

    title: str | None = None
    status: str | None = None  # "active" | "completed"


# ---------------------------------------------------------------------------
# Error schema
# ---------------------------------------------------------------------------


class ErrorResponse(BaseModel):
    """Uniform error envelope for all 4xx/5xx responses."""

    error: str
    message: str
