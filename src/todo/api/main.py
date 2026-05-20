"""ASGI entry point for the Todo API.

Usage:
    uvicorn todo.api.main:app
    # or
    python -m todo.api.main

The ``DATABASE_PATH`` environment variable controls which SQLite file is used.
If absent, the default ``./todos.db`` is used (with a warning).
"""

from __future__ import annotations

from todo.api.app import create_app

#: The ASGI application instance — referenced by uvicorn and gunicorn.
app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
