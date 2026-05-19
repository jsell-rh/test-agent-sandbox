"""FastAPI application — REST API for the Todo application.

Application Layer responsibilities:
- Parse HTTP requests into Domain objects.
- Invoke Domain commands (Todo aggregate methods).
- Translate Domain errors to HTTP error envelopes.
- Serialize Domain objects to JSON resource representations.

No business rules live here. All invariant enforcement is in the Aggregate.
"""

# Note: from __future__ import annotations is intentionally omitted here.
# FastAPI introspects function annotations at definition time to discover
# Depends() declarations; making annotations lazy strings breaks that lookup.

from typing import Optional

from fastapi import Depends, FastAPI, Query, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from todo.domain.errors import InvalidTitleError, TodoNotFoundError
from todo.domain.repository import TodoRepository
from todo.domain.todo import Todo
from todo.domain.value_objects import FilterCriteria, TodoId, TodoStatus, TodoTitle
from todo.infrastructure.sqlite_repository import SqliteTodoRepository

# ---------------------------------------------------------------------------
# Error codes (no magic strings)
# ---------------------------------------------------------------------------

_ERR_INVALID_TITLE = "INVALID_TITLE"
_ERR_TODO_NOT_FOUND = "TODO_NOT_FOUND"
_ERR_BAD_REQUEST = "BAD_REQUEST"
_ERR_INTERNAL_ERROR = "INTERNAL_ERROR"

# Valid filter parameter values (mirrors FilterCriteria enum)
_VALID_FILTER_VALUES = {fc.value for fc in FilterCriteria}

# Valid status values accepted on PATCH (mirrors TodoStatus enum)
_VALID_STATUS_VALUES = {s.value for s in TodoStatus}


# ---------------------------------------------------------------------------
# Resource serialisation
# ---------------------------------------------------------------------------

def _todo_to_dict(todo: Todo) -> dict:
    """Serialise a Todo aggregate to the API resource representation."""
    return {
        "id":        todo.id.value,
        "title":     todo.title.value,
        "status":    todo.status.value,
        "createdAt": todo.created_at.value,
        "updatedAt": todo.updated_at.value,
    }


# ---------------------------------------------------------------------------
# Error envelope helpers
# ---------------------------------------------------------------------------

def _error_response(status_code: int, error_code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": error_code, "message": message},
    )


# ---------------------------------------------------------------------------
# Default repository factory (module-level so overrides work with DI)
# ---------------------------------------------------------------------------

def _get_repository() -> SqliteTodoRepository:
    """Default repository factory — uses DATABASE_PATH env var."""
    return SqliteTodoRepository()


# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------

def create_app(
    repository: Optional[TodoRepository] = None,
) -> FastAPI:
    """
    Create and configure the FastAPI application.

    Args:
        repository: Optional TodoRepository override (used in tests to inject
                    an in-memory SQLite repository).  When None the default
                    SqliteTodoRepository is used (DATABASE_PATH env var).
    """
    app = FastAPI(title="Todo API")

    # ------------------------------------------------------------------
    # Dependency injection override
    # ------------------------------------------------------------------

    if repository is not None:
        provided_repo = repository

        def _repo_override() -> TodoRepository:
            return provided_repo

        app.dependency_overrides[_get_repository] = _repo_override

    # ------------------------------------------------------------------
    # Global exception handlers
    # ------------------------------------------------------------------

    @app.exception_handler(RequestValidationError)
    async def _validation_error_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return _error_response(400, _ERR_BAD_REQUEST, str(exc))

    @app.exception_handler(Exception)
    async def _internal_error_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        return _error_response(500, _ERR_INTERNAL_ERROR, str(exc))

    # ------------------------------------------------------------------
    # Endpoints
    # ------------------------------------------------------------------

    @app.get("/api/todos")
    async def list_todos(
        repo: TodoRepository = Depends(_get_repository),
        filter: Optional[str] = Query(default="all"),
    ) -> JSONResponse:
        """List all Todos with optional filtering; counts always reflect ALL todos."""
        if filter not in _VALID_FILTER_VALUES:
            return _error_response(
                400,
                _ERR_BAD_REQUEST,
                f"Invalid filter value {filter!r}. Must be one of: "
                + ", ".join(sorted(_VALID_FILTER_VALUES)),
            )
        criteria = FilterCriteria(filter)
        todos = repo.find_all(criteria)
        counts = repo.counts()
        return JSONResponse(
            status_code=200,
            content={
                "todos":  [_todo_to_dict(t) for t in todos],
                "counts": counts,
            },
        )

    @app.post("/api/todos")
    async def create_todo(
        request: Request,
        repo: TodoRepository = Depends(_get_repository),
    ) -> JSONResponse:
        """Create a new Todo."""
        try:
            body = await request.json()
        except Exception:
            return _error_response(400, _ERR_BAD_REQUEST, "Malformed JSON body")

        raw_title = body.get("title", "")
        try:
            title = TodoTitle(raw_title)
        except InvalidTitleError as exc:
            return _error_response(422, _ERR_INVALID_TITLE, str(exc))

        todo = Todo.create(title=title)
        repo.save(todo)
        todo.pull_events()  # drain events; no event bus in this layer
        return JSONResponse(status_code=201, content=_todo_to_dict(todo))

    @app.get("/api/todos/{todo_id}")
    async def get_todo(
        todo_id: str,
        repo: TodoRepository = Depends(_get_repository),
    ) -> JSONResponse:
        """Fetch a single Todo by id."""
        todo = repo.find_by_id(TodoId.of(todo_id))
        if todo is None:
            return _error_response(
                404, _ERR_TODO_NOT_FOUND, f"Todo not found: {todo_id!r}"
            )
        return JSONResponse(status_code=200, content=_todo_to_dict(todo))

    @app.patch("/api/todos/{todo_id}")
    async def update_todo(
        todo_id: str,
        request: Request,
        repo: TodoRepository = Depends(_get_repository),
    ) -> JSONResponse:
        """Partially update a Todo (title and/or status)."""
        try:
            body = await request.json()
        except Exception:
            return _error_response(400, _ERR_BAD_REQUEST, "Malformed JSON body")

        todo = repo.find_by_id(TodoId.of(todo_id))
        if todo is None:
            return _error_response(
                404, _ERR_TODO_NOT_FOUND, f"Todo not found: {todo_id!r}"
            )

        # Apply title update if provided.
        if "title" in body:
            try:
                new_title = TodoTitle(body["title"])
            except InvalidTitleError as exc:
                return _error_response(422, _ERR_INVALID_TITLE, str(exc))
            todo.update_title(new_title)

        # Apply status update if provided.
        if "status" in body:
            raw_status = body["status"]
            if raw_status not in _VALID_STATUS_VALUES:
                return _error_response(
                    400,
                    _ERR_BAD_REQUEST,
                    f"Invalid status value {raw_status!r}. Must be one of: "
                    + ", ".join(sorted(_VALID_STATUS_VALUES)),
                )
            if raw_status == TodoStatus.COMPLETED.value:
                todo.complete()
            else:
                todo.reopen()

        repo.save(todo)
        todo.pull_events()
        return JSONResponse(status_code=200, content=_todo_to_dict(todo))

    @app.delete("/api/todos/{todo_id}")
    async def delete_todo(
        todo_id: str,
        repo: TodoRepository = Depends(_get_repository),
    ) -> Response:
        """Permanently delete a single Todo."""
        todo = repo.find_by_id(TodoId.of(todo_id))
        if todo is None:
            return _error_response(
                404, _ERR_TODO_NOT_FOUND, f"Todo not found: {todo_id!r}"
            )
        todo.delete()
        repo.delete(TodoId.of(todo_id))
        todo.pull_events()
        return Response(status_code=204)

    @app.delete("/api/todos")
    async def clear_completed(
        repo: TodoRepository = Depends(_get_repository),
        status: Optional[str] = Query(default=None),
    ) -> JSONResponse:
        """Bulk delete all completed Todos ('Clear completed' action)."""
        if status != TodoStatus.COMPLETED.value:
            return _error_response(
                400,
                _ERR_BAD_REQUEST,
                f"Unsupported status filter {status!r}. Only 'completed' is accepted.",
            )
        deleted_count = repo.delete_completed()
        return JSONResponse(
            status_code=200,
            content={"deletedCount": deleted_count},
        )

    return app


# ---------------------------------------------------------------------------
# ASGI entry-point (used by uvicorn)
# ---------------------------------------------------------------------------

app = create_app()
