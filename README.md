# Todos

Enterprise-grade todo management built with Nuxt 4 and SQLite.

## Prerequisites

- Node.js 20+
- npm

## Install

```bash
npm install
```

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production

```bash
npm run build
npm run preview
```

## Configuration

| Variable        | Default       | Description                      |
|-----------------|---------------|----------------------------------|
| `DATABASE_PATH` | `./todos.db`  | Path to the SQLite database file |

Set the variable before starting the server:

```bash
DATABASE_PATH=/var/data/todos.db npm run preview
```

## Testing

```bash
npm run test:all    # run all tests (server + UI)
npm test            # server/infrastructure tests only
npm run test:ui     # UI component tests only
```
