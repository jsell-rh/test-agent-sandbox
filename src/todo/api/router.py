"""FastAPI router for the Todo REST API.

All endpoints are mounted under /api/todos (the base path is set in app.py).

This module is the Application Layer: it coordinates HTTP requests with
the Todo Aggregate and TodoRepository. It contains no business rules —
those live in the Aggregate.

Separation rule: condition checks that could make a Todo invalid belong in
the Aggregate (e.g. title validation), not here.
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from fastapi.responses import JSONResponse

from todo.api.schemas import (
    ERROR_BAD_REQUEST,
    ERROR_INTERNAL_ERROR,
    ERROR_INVALID_TITLE,
    ERROR_TODO_NOT_FOUND,
    VALID_FILTER_VALUES,
    VALID_STATUS_VALUES,
    CountsResource,
    CreateTodoRequest,
    DeleteCompletedResponse,
    ErrorResponse,
    ListTodosResponse,
    PatchTodoRequest,
    TodoResource,
)
from todo.domain.errors import InvalidTitleError, TodoNotFoundError
from todo.domain.repository import TodoRepository
from todo.domain.value_objects import FilterCriteria, TodoId, TodoStatus, TodoTitle

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Dependency: repository
# ---------------------------------------------------------------------------


def get_repository(request: Request) -> TodoRepository:
    """Retrieve the TodoRepository instance from application state."""
    return request.app.state.repository


# ---------------------------------------------------------------------------
# GET /api/todos
# ---------------------------------------------------------------------------


@router.get(
    "",
    response_model=ListTodosResponse,
    summary="List all Todos with optional FilterCriteria",
)
def list_todos(
    filter: Optional[str] = Query(default="all"),
    repo: TodoRepository = Depends(get_repository),
) -> ListTodosResponse:
    """Return all todos, optionally filtered, plus aggregate counts over ALL todos.

    The ``counts`` field is always computed over ALL todos regardless of the
    ``filter`` parameter, so the UI can display all tab counts in one request.

    Args:
        filter: FilterCriteria value — 'all', 'active', or 'completed'. Default 'all'.

    Raises:
        HTTPException 400: if ``filter`` is not a recognised FilterCriteria value.
    """
    if filter not in VALID_FILTER_VALUES:
        raise HTTPException(
            status_code=400,
            detail=ErrorResponse(
                error=ERROR_BAD_REQUEST,
                message=f"Invalid filter value {filter!r}. "
                f"Must be one of: {', '.join(sorted(VALID_FILTER_VALUES))}.",
            ).model_dump(),
        )

    criteria = FilterCriteria(filter)
    todos = repo.find_all(criteria)
    raw_counts = repo.counts()

    return ListTodosResponse(
        todos=[TodoResource.from_domain(t) for t in todos],
        counts=CountsResource(
            all=raw_counts["all"],
            active=raw_counts["active"],
            completed=raw_counts["completed"],
        ),
    )


# ---------------------------------------------------------------------------
# POST /api/todos
# ---------------------------------------------------------------------------


@router.post(
    "",
    status_code=201,
    response_model=TodoResource,
    summary="Create a new Todo",
)
def create_todo(
    body: CreateTodoRequest,
    repo: TodoRepository = Depends(get_repository),
) -> TodoResource:
    """Create a new Todo via ``Todo.create()``.

    Args:
        body: JSON body with a ``title`` field.

    Returns:
        The created Todo resource with HTTP 201.

    Raises:
        HTTPException 422: if the title is blank or too long (InvalidTitleError).
    """
    try:
        title = TodoTitle(body.title)
    except InvalidTitleError as exc:
        raise HTTPException(
            status_code=422,
            detail=ErrorResponse(
                error=ERROR_INVALID_TITLE,
                message=str(exc),
            ).model_dump(),
        ) from exc

    from todo.domain.todo import Todo

    todo = Todo.create(title)
    repo.save(todo)
    return TodoResource.from_domain(todo)


# ---------------------------------------------------------------------------
# GET /api/todos/:id
# ---------------------------------------------------------------------------


@router.get(
    "/{todo_id}",
    response_model=TodoResource,
    summary="Fetch a single Todo by TodoId",
)
def get_todo(
    todo_id: str,
    repo: TodoRepository = Depends(get_repository),
) -> TodoResource:
    """Return a single Todo resource.

    Args:
        todo_id: The UUID v4 string identifying the Todo.

    Raises:
        HTTPException 404: if the TodoId is not found.
    """
    todo = repo.find_by_id(TodoId.of(todo_id))
    if todo is None:
        raise HTTPException(
            status_code=404,
            detail=ErrorResponse(
                error=ERROR_TODO_NOT_FOUND,
                message=f"Todo not found: {todo_id!r}",
            ).model_dump(),
        )
    return TodoResource.from_domain(todo)


# ---------------------------------------------------------------------------
# PATCH /api/todos/:id
# ---------------------------------------------------------------------------


@router.patch(
    "/{todo_id}",
    response_model=TodoResource,
    summary="Partial update of a Todo (title and/or status)",
)
def patch_todo(
    todo_id: str,
    body: PatchTodoRequest,
    repo: TodoRepository = Depends(get_repository),
) -> TodoResource:
    """Partial update: independently update title and/or status.

    Mapping to domain commands:
    - ``title`` present  -> ``todo.update_title()``
    - ``status: completed`` -> ``todo.complete()``
    - ``status: active``    -> ``todo.reopen()``

    Args:
        todo_id: The UUID v4 string identifying the Todo.
        body:    Partial update fields.

    Raises:
        HTTPException 404: if the TodoId is not found.
        HTTPException 422: if the new title is invalid (InvalidTitleError).
    """
    todo = repo.find_by_id(TodoId.of(todo_id))
    if todo is None:
        raise HTTPException(
            status_code=404,
            detail=ErrorResponse(
                error=ERROR_TODO_NOT_FOUND,
                message=f"Todo not found: {todo_id!r}",
            ).model_dump(),
        )

    # Apply title update first (may raise InvalidTitleError before any mutation)
    if body.title is not None:
        try:
            new_title = TodoTitle(body.title)
        except InvalidTitleError as exc:
            raise HTTPException(
                status_code=422,
                detail=ErrorResponse(
                    error=ERROR_INVALID_TITLE,
                    message=str(exc),
                ).model_dump(),
            ) from exc
        todo.update_title(new_title)

    # Apply status update
    if body.status == TodoStatus.COMPLETED.value:
        todo.complete()
    elif body.status == TodoStatus.ACTIVE.value:
        todo.reopen()

    repo.save(todo)
    return TodoResource.from_domain(todo)


# ---------------------------------------------------------------------------
# DELETE /api/todos/:id  AND  DELETE /api/todos?status=completed
#
# Both share the DELETE method on the collection/item paths. The
# "bulk delete" variant is distinguished by the presence of ?status=completed.
# To avoid path ambiguity we define the bulk route first, before the item route,
# but FastAPI already handles them separately because one uses a path parameter.
# We use a dedicated handler so the routing is unambiguous.
# ---------------------------------------------------------------------------


@router.delete(
    "",
    response_model=DeleteCompletedResponse,
    summary="Bulk delete all completed Todos",
)
def delete_completed(
    status: Optional[str] = Query(default=None),
    repo: TodoRepository = Depends(get_repository),
) -> DeleteCompletedResponse:
    """Delete all completed Todos ('Clear completed' action).

    The ``status`` query parameter must be ``completed``.

    Args:
        status: Must be ``"completed"`` for this operation to proceed.

    Returns:
        JSON body with ``deletedCount`` — the number of todos removed.

    Raises:
        HTTPException 400: if ``status`` is absent or not ``"completed"``.
    """
    if status != TodoStatus.COMPLETED.value:
        raise HTTPException(
            status_code=400,
            detail=ErrorResponse(
                error=ERROR_BAD_REQUEST,
                message=(
                    f"Invalid status parameter {status!r}. "
                    f"Use status=completed to bulk-delete completed todos."
                ),
            ).model_dump(),
        )

    completed_todos = repo.find_all(FilterCriteria.COMPLETED)
    for todo in completed_todos:
        repo.delete(todo.id)

    return DeleteCompletedResponse(deletedCount=len(completed_todos))


@router.delete(
    "/{todo_id}",
    status_code=204,
    summary="Permanently delete a single Todo",
)
def delete_todo(
    todo_id: str,
    response: Response,
    repo: TodoRepository = Depends(get_repository),
) -> None:
    """Permanently delete a Todo.

    Args:
        todo_id: The UUID v4 string identifying the Todo.

    Returns:
        HTTP 204 No Content on success.

    Raises:
        HTTPException 404: if the TodoId is not found.
    """
    todo = repo.find_by_id(TodoId.of(todo_id))
    if todo is None:
        raise HTTPException(
            status_code=404,
            detail=ErrorResponse(
                error=ERROR_TODO_NOT_FOUND,
                message=f"Todo not found: {todo_id!r}",
            ).model_dump(),
        )
    todo.delete()
    repo.delete(todo.id)
    response.status_code = 204
