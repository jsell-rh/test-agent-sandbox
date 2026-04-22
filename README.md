# Todos

Enterprise-grade todo management built with Nuxt 4 and SQLite.

## Prerequisites

- Node.js 20+
- npm

## Setup

```bash
npm install
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

| Variable        | Default            | Description              |
|-----------------|--------------------|--------------------------|
| `DATABASE_PATH` | `./data/todos.db`  | Path to the SQLite database file |

## Testing

```bash
npm test              # run all tests
npm run test:app      # unit/component tests only
npm run test:infra    # infrastructure tests only
npm run test:watch    # watch mode
```
