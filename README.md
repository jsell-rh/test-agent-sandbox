# Todos

Enterprise todo management built with Nuxt 4 and SQLite.

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

Open [http://localhost:3000](http://localhost:3000). The API is served under `/api/todos`.

## Production

```bash
npm run build
npm run preview
```

## Configuration

| Variable        | Default       | Description                       |
|-----------------|---------------|-----------------------------------|
| `DATABASE_PATH` | `./todos.db`  | Path to the SQLite database file  |

```bash
DATABASE_PATH=/var/data/todos.db npm run preview
```

## Testing

```bash
npm test              # all tests
npm run test:app      # UI/component tests only
npm run test:infra    # persistence and API tests only
npm run test:watch    # watch mode
```
