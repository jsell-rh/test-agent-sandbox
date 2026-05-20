"""FastAPI router — REST/JSON endpoints for the Todo API.

Base path: /api/todos

All business rules are delegated to the Todo Aggregate.  This layer is
responsible only for translating between HTTP representations and domain
objects and for mapping domain errors to the appropriate HTTP status codes.

All response bodies use explicit ``JSONResponse`` so that FastAPI does not
try to infer a response model from union return types.

Error envelope (all 4xx/5xx):
    {"error": "ERROR_CODE_CONSTANT", "message": "Human-readable description"}
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import JSONResponse

from todo.api.dependencies import get_repository
from todo.api.schemas import (
    CreateTodoRequest,
    DeletedCountResponse,
    ErrorResponse,
    TodoCountsResponse,
    TodoListResponse,
    TodoResponse,
    UpdateTodoRequest,
)
from todo.domain.errors import InvalidTitleError, TodoNotFoundError
from todo.domain.repository import TodoRepository
from todo.domain.todo import Todo
from todo.domain.value_objects import FilterCriteria, TodoId, TodoTitle

# ---------------------------------------------------------------------------
# Named constants — avoids magic strings throughout the module
# ---------------------------------------------------------------------------

_FILTER_ALL = FilterCriteria.ALL.value
_FILTER_ACTIVE = FilterCriteria.ACTIVE.value
_FILTER_COMPLETED = FilterCriteria.COMPLETED.value

_VALID_FILTER_VALUES: frozenset[str] = frozenset(
    {_FILTER_ALL, _FILTER_ACTIVE, _FILTER_COMPLETED}
)

_STATUS_ACTIVE = "active"
_STATUS_COMPLETED = "completed"
_VALID_STATUS_VALUES: frozenset[str] = frozenset({_STATUS_ACTIVE, _STATUS_COMPLETED})

_ERROR_NOT_FOUND = "TODO_NOT_FOUND"
_ERROR_INVALID_TITLE = "INVALID_TITLE"
_ERROR_BAD_REQUEST = "BAD_REQUEST"
_ERROR_INTERNAL = "INTERNAL_ERROR"

# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

router = APIRouter(prefix="/api/todos", tags=["todos"])

# Type alias for the injected repository dependency
RepoDep = Annotated[TodoRepository, Depends(get_repository)]


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------


def _todo_to_response(todo: Todo) -> TodoResponse:
    """Convert a domain Todo to its JSON resource representation."""
    return TodoResponse(
        id=todo.id.value,
        title=todo.title.value,
        status=todo.status.value,
        createdAt=todo.created_at.value,
        updatedAt=todo.updated_at.value,
    )


def _ok(data: object, status_code: int = 200) -> JSONResponse:
    """Build a successful JSON response from a Pydantic model or dict."""
    if hasattr(data, "model_dump"):
        content = data.model_dump()
    else:
        content = data
    return JSONResponse(status_code=status_code, content=content)


def _error(code: str, message: str, status_code: int) -> JSONResponse:
    """Build a uniform error JSON response."""
    body = ErrorResponse(error=code, message=message)
    return JSONResponse(
        status_code=status_code,
        content=body.model_dump(),
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("", response_model=None)
def list_todos(
    repo: RepoDep,
    filter: str = Query(default=_FILTER_ALL),
) -> JSONResponse:
    """GET /api/todos — list todos with optional filter.

    ``counts`` always reflects all todos regardless of ``filter``.
    """
    if filter not in _VALID_FILTER_VALUES:
        return _error(
            _ERROR_BAD_REQUEST,
            f"Invalid filter value {filter!r}. Must be one of: "
            f"{', '.join(sorted(_VALID_FILTER_VALUES))}.",
            400,
        )

    criteria = FilterCriteria(filter)
    todos = repo.find_all(criteria)
    counts = repo.counts()

    body = TodoListResponse(
        todos=[_todo_to_response(t) for t in todos],
        counts=TodoCountsResponse(
            all=counts["all"],
            active=counts["active"],
            completed=counts["completed"],
        ),
    )
    return _ok(body)


@router.post("", response_model=None, status_code=201)
def create_todo(
    body: CreateTodoRequest,
    repo: RepoDep,
) -> JSONResponse:
    """POST /api/todos — create a new Todo."""
    try:
        title = TodoTitle(body.title)
    except InvalidTitleError as exc:
        return _error(_ERROR_INVALID_TITLE, str(exc), 422)

    todo = Todo.create(title)
    repo.save(todo)
    return _ok(_todo_to_response(todo), status_code=201)


@router.get("/{todo_id}", response_model=None)
def get_todo(
    todo_id: str,
    repo: RepoDep,
) -> JSONResponse:
    """GET /api/todos/:id — fetch a single Todo."""
    todo = repo.find_by_id(TodoId(todo_id))
    if todo is None:
        return _error(_ERROR_NOT_FOUND, f"Todo {todo_id!r} not found.", 404)
    return _ok(_todo_to_response(todo))


@router.patch("/{todo_id}", response_model=None)
def update_todo(
    todo_id: str,
    body: UpdateTodoRequest,
    repo: RepoDep,
) -> JSONResponse:
    """PATCH /api/todos/:id — partial update of title and/or status.

    Mapping:
    - ``title`` present     -> ``todo.update_title()``
    - ``status: completed`` -> ``todo.complete()``
    - ``status: active``    -> ``todo.reopen()``
    """
    if body.status is not None and body.status not in _VALID_STATUS_VALUES:
        return _error(
            _ERROR_BAD_REQUEST,
            f"Invalid status value {body.status!r}. Must be one of: "
            f"{', '.join(sorted(_VALID_STATUS_VALUES))}.",
            400,
        )

    todo = repo.find_by_id(TodoId(todo_id))
    if todo is None:
        return _error(_ERROR_NOT_FOUND, f"Todo {todo_id!r} not found.", 404)

    if body.title is not None:
        try:
            todo.update_title(TodoTitle(body.title))
        except InvalidTitleError as exc:
            return _error(_ERROR_INVALID_TITLE, str(exc), 422)

    if body.status == _STATUS_COMPLETED:
        todo.complete()
    elif body.status == _STATUS_ACTIVE:
        todo.reopen()

    repo.save(todo)
    return _ok(_todo_to_response(todo))


@router.delete("/{todo_id}", response_model=None, status_code=204)
def delete_todo(
    todo_id: str,
    repo: RepoDep,
) -> Response | JSONResponse:
    """DELETE /api/todos/:id — permanently delete a Todo.

    Returns 204 No Content on success, 404 if not found.
    """
    todo = repo.find_by_id(TodoId(todo_id))
    if todo is None:
        return _error(_ERROR_NOT_FOUND, f"Todo {todo_id!r} not found.", 404)

    todo.delete()
    repo.delete(todo.id)
    return Response(status_code=204)


@router.delete("", response_model=None)
def delete_completed(
    repo: RepoDep,
    status: str = Query(...),
) -> JSONResponse:
    """DELETE /api/todos?status=completed — bulk-delete all completed Todos.

    The ``status`` query parameter is required and must be ``"completed"``.
    Returns the count of deleted todos.
    """
    if status != _STATUS_COMPLETED:
        return _error(
            _ERROR_BAD_REQUEST,
            f"Invalid status value {status!r} for bulk delete. "
            f"Only 'completed' is supported.",
            400,
        )

    completed_todos = repo.find_all(FilterCriteria.COMPLETED)
    for todo in completed_todos:
        repo.delete(todo.id)

    return _ok(DeletedCountResponse(deletedCount=len(completed_todos)))
