"""FastAPI application factory for the Todo API.

Usage:
    uvicorn todo.api.app:create_app --factory --reload

Or as a module:
    python -m todo.api.app

The DATABASE_PATH environment variable controls where the SQLite file lives.
Set DATABASE_PATH=:memory: for in-memory testing.
"""

from __future__ import annotations

import logging
import os

from fastapi import FastAPI, Request
from fastapi.exceptions import HTTPException, RequestValidationError
from fastapi.responses import JSONResponse

from todo.api.router import router
from todo.api.schemas import ERROR_BAD_REQUEST, ERROR_INTERNAL_ERROR, ErrorResponse
from todo.infrastructure.sqlite_repository import SqliteTodoRepository

logger = logging.getLogger(__name__)

# The base path for all todo endpoints, as per the spec.
API_BASE_PATH = "/api/todos"


def create_app(database_path: str | None = None) -> FastAPI:
    """Create and configure the FastAPI application.

    Args:
        database_path: SQLite database path.  Falls back to DATABASE_PATH env
            var, then to the default (./todos.db) if neither is provided.

    Returns:
        A fully configured FastAPI application instance.
    """
    app = FastAPI(
        title="Todo API",
        description="REST API for the Todo application.",
        version="1.0.0",
    )

    # Initialise the repository and attach it to app state so router
    # dependency injection can retrieve it via request.app.state.repository.
    app.state.repository = SqliteTodoRepository(database_path)

    # Mount all Todo endpoints under the spec-mandated base path.
    app.include_router(router, prefix=API_BASE_PATH)

    # ------------------------------------------------------------------
    # Global exception handlers — enforce the standard error envelope for
    # all unhandled errors.
    # ------------------------------------------------------------------

    @app.exception_handler(HTTPException)
    async def http_exception_handler(
        request: Request, exc: HTTPException
    ) -> JSONResponse:
        """Return the spec's standard error envelope for all HTTPException raises.

        FastAPI's default HTTPException handler wraps the detail in
        ``{"detail": ...}``.  This handler ensures the envelope is returned
        at the top level: ``{"error": "...", "message": "..."}``.

        The router always passes an ``ErrorResponse`` dict as ``exc.detail``.
        If a non-dict detail is received (e.g. from a third-party middleware),
        it is wrapped in a generic BAD_REQUEST envelope.
        """
        if isinstance(exc.detail, dict) and "error" in exc.detail:
            content = exc.detail
        else:
            content = ErrorResponse(
                error=ERROR_BAD_REQUEST,
                message=str(exc.detail),
            ).model_dump()
        return JSONResponse(status_code=exc.status_code, content=content)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        """Map FastAPI request-validation failures (malformed JSON, wrong types)
        to the spec's standard error envelope with HTTP 400 BAD_REQUEST.
        """
        return JSONResponse(
            status_code=400,
            content=ErrorResponse(
                error=ERROR_BAD_REQUEST,
                message="Malformed request body or invalid field types.",
            ).model_dump(),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        logger.exception("Unhandled exception processing %s %s", request.method, request.url)
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                error=ERROR_INTERNAL_ERROR,
                message="An unexpected error occurred.",
            ).model_dump(),
        )

    return app


# Allow running the server directly: `python -m todo.api.app`
if __name__ == "__main__":
    import uvicorn

    app = create_app()
    uvicorn.run(
        app,
        host=os.environ.get("HOST", "0.0.0.0"),
        port=int(os.environ.get("PORT", "8000")),
        log_level="info",
    )
