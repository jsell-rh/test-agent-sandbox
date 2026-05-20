"""FastAPI application factory for the Todo API.

Call :func:`create_app` to obtain a configured ``FastAPI`` instance.
This factory pattern allows tests to override dependencies (e.g. inject
an in-memory repository) before the app begins handling requests.

Startup lifecycle:
1. ``create_app()`` registers routes and exception handlers.
2. The :func:`~todo.api.dependencies.get_repository` dependency opens a
   SQLite connection and runs migrations on each request.

The UI (single-page application) is served from ``static/index.html``
at ``GET /``.
"""

from __future__ import annotations

import logging
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from todo.api.routes import router
from todo.domain.errors import InvalidTitleError, TodoNotFoundError

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Named constants
# ---------------------------------------------------------------------------

_ERROR_NOT_FOUND = "TODO_NOT_FOUND"
_ERROR_INVALID_TITLE = "INVALID_TITLE"
_ERROR_BAD_REQUEST = "BAD_REQUEST"
_ERROR_INTERNAL = "INTERNAL_ERROR"

_STATIC_DIR: Path = Path(__file__).parent / "static"


# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------


def create_app() -> FastAPI:
    """Create and configure the FastAPI application.

    Returns:
        A fully configured :class:`fastapi.FastAPI` instance ready to serve.
    """
    app = FastAPI(
        title="Todo API",
        description="REST API for managing Todo items.",
        version="1.0.0",
    )

    # ------------------------------------------------------------------
    # Exception handlers — map domain and validation errors to the
    # uniform error envelope {error, message}.
    # ------------------------------------------------------------------

    @app.exception_handler(InvalidTitleError)
    async def invalid_title_handler(
        request: Request, exc: InvalidTitleError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={"error": _ERROR_INVALID_TITLE, "message": str(exc)},
        )

    @app.exception_handler(TodoNotFoundError)
    async def not_found_handler(
        request: Request, exc: TodoNotFoundError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=404,
            content={"error": _ERROR_NOT_FOUND, "message": str(exc)},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        # FastAPI raises RequestValidationError for malformed request bodies
        # and missing/invalid query parameters — all map to 400 Bad Request.
        message = "; ".join(
            f"{'.'.join(str(loc) for loc in err['loc'])}: {err['msg']}"
            for err in exc.errors()
        )
        return JSONResponse(
            status_code=400,
            content={"error": _ERROR_BAD_REQUEST, "message": message},
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        logger.exception("Unhandled exception: %s", exc)
        return JSONResponse(
            status_code=500,
            content={"error": _ERROR_INTERNAL, "message": "An internal error occurred."},
        )

    # ------------------------------------------------------------------
    # Routers
    # ------------------------------------------------------------------

    app.include_router(router)

    # ------------------------------------------------------------------
    # Static files — the single-page application
    # ------------------------------------------------------------------

    if _STATIC_DIR.exists():
        app.mount("/static", StaticFiles(directory=str(_STATIC_DIR)), name="static")

        @app.get("/", include_in_schema=False)
        async def serve_spa() -> FileResponse:
            """Serve the SPA entry point."""
            return FileResponse(str(_STATIC_DIR / "index.html"))

    return app
