# Todo App

A task management application built with clean domain-driven design.

## Prerequisites

- Python 3.12+
- [uv](https://docs.astral.sh/uv/) (package manager)

## Setup

```bash
uv sync
```

## Run Tests

```bash
uv run pytest
```

## API

Base URL: `http://localhost:8000/api/todos`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/todos` | List todos (`?filter=all\|active\|completed`) |
| `POST` | `/api/todos` | Create a todo (`{"title": "..."}`) |
| `GET` | `/api/todos/:id` | Get a todo |
| `PATCH` | `/api/todos/:id` | Update title or status |
| `DELETE` | `/api/todos/:id` | Delete a todo |
| `DELETE` | `/api/todos?status=completed` | Clear all completed todos |
