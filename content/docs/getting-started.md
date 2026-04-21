---
title: Getting Started
description: Learn how to install, configure, and run your Enterprise Platform in minutes.
---

# Getting Started

Welcome to the **Enterprise Platform** — a production-ready documentation and application framework
built on Nuxt 4, Nuxt UI, and Nuxt Content. This guide walks you through everything you need
to go from zero to a running platform.

---

## Prerequisites

Before you begin, make sure you have the following installed:

| Tool | Minimum version | Recommended |
|------|----------------|-------------|
| Node.js | 18.0.0 | 20 LTS |
| npm | 9.0.0 | 10+ |
| Git | 2.30 | latest |

> **Note:** The platform uses ES Modules (`"type": "module"` in `package.json`). Make sure your
> Node.js version supports ESM natively.

---

## Installation

### Clone the repository

```bash
git clone https://github.com/your-org/enterprise-platform.git
cd enterprise-platform
```

### Install dependencies

```bash
npm install
```

This installs all runtime and development dependencies defined in `package.json`, including:

- `nuxt` ^4.4 — the application framework
- `@nuxt/ui` ^4.6 — enterprise UI component library
- `@nuxt/content` ^3.13 — markdown content pipeline
- `typescript` ^5.8 — type checker

---

## Configuration

The platform is configured via `nuxt.config.ts` at the project root.

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',

  future: {
    compatibilityVersion: 4,   // opt into Nuxt 4 conventions
  },

  modules: [
    '@nuxt/ui',
    '@nuxt/content',
  ],

  content: {
    highlight: {
      theme: {
        default: 'github-light',
        dark: 'github-dark',
      },
    },
  },

  colorMode: {
    classSuffix: '',  // use `.dark` class, not `.dark-mode`
  },
})
```

### Environment variables

Create a `.env` file in the project root to override settings at runtime:

```bash
# .env
NUXT_PUBLIC_SITE_URL=https://platform.example.com
NUXT_PUBLIC_API_BASE=/api
```

> **Never commit `.env` files.** The `.gitignore` already excludes them.

---

## Running locally

### Development server

```bash
npm run dev
```

The dev server starts at `http://localhost:3000` with hot-module replacement enabled.
Content changes (Markdown files) are picked up instantly without a full reload.

### Type checking

```bash
npm run typecheck
```

Runs `vue-tsc` and `nuxt typecheck` in sequence. Fix any type errors before opening a PR.

---

## Project structure

After installation the project layout looks like this:

```
enterprise-platform/
├── app/                    # Nuxt 4 source root
│   ├── assets/css/         # Global stylesheets
│   ├── components/         # Shared Vue components
│   ├── layouts/            # Page layouts
│   └── pages/              # File-based routing
│       ├── index.vue       # Landing page
│       └── docs/
│           └── [...slug].vue  # Catch-all docs route
├── content/                # Markdown content
│   ├── index.md
│   └── docs/
│       └── getting-started.md
├── nuxt.config.ts
├── tsconfig.json
└── package.json
```

> **Nuxt 4 convention:** Source files live inside `app/` rather than the project root.
> This keeps configuration files at the top level uncluttered.

---

## Writing documentation

Add any `.md` file under `content/docs/` and it becomes instantly available at the
corresponding URL.

```bash
# Creates /docs/authentication
touch content/docs/authentication.md
```

Use frontmatter to control metadata:

```yaml
---
title: Authentication
description: Secure your platform with OAuth 2.0 and JWT.
---
```

### Supported markdown features

| Feature | Example |
|---------|---------|
| Headers | `# H1`, `## H2`, … |
| Code blocks | ` ```typescript ` |
| Tables | `\| col \| col \|` |
| Callouts | `> **Note:** …` |
| Links | `[text](url)` |
| Images | `![alt](src)` |

---

## Building for production

### Static site generation (recommended)

```bash
npm run generate
```

Outputs a fully static site to `.output/public/`. Deploy to any CDN.

### Server-side rendering

```bash
npm run build
npm run preview
```

Starts a Node.js server at `http://localhost:3000`.

---

## Deployment

### Vercel

```bash
npx vercel --prod
```

### Netlify

```bash
npx netlify deploy --prod --dir .output/public
```

### Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
```

---

## Next steps

- **[Configuration](/docs/configuration)** — deep-dive into all available options
- **[Components](/docs/components)** — browse the built-in UI component library
- **[API Reference](/docs/api)** — programmatic access to your content
- **[Deployment](/docs/deployment)** — production hosting strategies
