# Todos

Enterprise-grade todo management — Nuxt 4 frontend, Python domain layer, SQLite storage.

## Prerequisites

- Node.js 20+
- Python 3.12+

## Setup

```bash
npm install
pip install -e .
```

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build & Preview

```bash
npm run build
npm run preview
```

## Configuration

| Variable        | Default           | Description                        |
|-----------------|-------------------|------------------------------------|
| `DATABASE_PATH` | `./data/todos.db` | Path to the SQLite database file   |
| `PORT`          | `3000`            | Port the server listens on         |

Set variables in a `.env` file at the project root:

```env
DATABASE_PATH=./data/todos.db
PORT=3000
```

## Testing

```bash
npm test          # all tests
pytest            # Python domain tests only
```
