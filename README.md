# Todo App

A full-stack Todo application. FastAPI backend with SQLite storage and a Nuxt 4 frontend.

## Prerequisites

- Python 3.12+
- Node.js 20+

## Quick Start

### Backend

```bash
pip install -e .
python -m uvicorn todo.server:app --reload
```

The API is available at `http://localhost:8000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The UI is available at `http://localhost:3000`.

## Configuration

| Variable        | Default       | Description                       |
|-----------------|---------------|-----------------------------------|
| `DATABASE_PATH` | `./todos.db`  | Path to the SQLite database file  |

## Tests

```bash
pytest
```
