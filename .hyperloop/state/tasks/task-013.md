---
id: task-013
title: Enterprise Design System — Nuxt UI and Tailwind Configuration
spec_ref: specs/user-interface.spec.md
status: not-started
phase: null
deps: [task-012]
round: 0
branch: null
pr: null
---

## Scope

Configure an enterprise-grade design system on top of the Nuxt 4 scaffold.
All visual primitives — color tokens, typography, spacing, and base components —
are established here so that UI tasks (task-009 through task-011) consume a
consistent, polished language rather than ad-hoc inline styles.

### Packages to install

- `@nuxt/ui` — component library built on Tailwind CSS, provides Button, Input,
  Checkbox, Badge, and layout primitives out of the box.
- `@nuxtjs/tailwindcss` is included transitively via `@nuxt/ui`; do not add it
  separately.

### `nuxt.config.ts` additions

```ts
modules: ['@nuxt/ui']
```

### Tailwind design tokens (`tailwind.config.ts`)

Define a neutral-forward enterprise palette:

```ts
theme: {
  extend: {
    colors: {
      brand: {          // primary accent — used for highlights, active states
        50:  '#f0f4ff',
        500: '#4f6ef7',
        600: '#3b55e0',
        900: '#1e2a6b',
      },
      surface: {        // card / panel backgrounds
        DEFAULT: '#ffffff',
        subtle:  '#f8f9fa',
        muted:   '#f1f3f5',
      },
      border: {
        DEFAULT: '#dee2e6',
        strong:  '#adb5bd',
      },
      text: {
        primary:   '#212529',
        secondary: '#6c757d',
        disabled:  '#adb5bd',
      },
    },
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace'],
    },
    fontSize: {
      xs:   ['0.75rem',  { lineHeight: '1rem' }],
      sm:   ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem',     { lineHeight: '1.5rem' }],
      lg:   ['1.125rem', { lineHeight: '1.75rem' }],
      xl:   ['1.25rem',  { lineHeight: '1.75rem' }],
      '2xl':['1.5rem',   { lineHeight: '2rem' }],
    },
    borderRadius: {
      sm:  '0.25rem',
      md:  '0.375rem',
      lg:  '0.5rem',
      xl:  '0.75rem',
    },
    boxShadow: {
      card: '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
      'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
    },
  },
}
```

### Global stylesheet (`assets/css/main.css`)

- Import Inter font from Google Fonts (or bundle via `nuxt-fonts`).
- Set `html { font-family: 'Inter', ... }` and `body { background: surface.subtle }`.
- No reset frameworks beyond Tailwind's preflight.

### Base layout (`layouts/default.vue`)

```
┌─────────────────────────────────────┐
│  Header: brand bar (text-2xl,       │
│  brand-900, border-b, shadow-sm)    │
├─────────────────────────────────────┤
│  <main>: max-w-2xl mx-auto px-4     │
│  py-8 — slot for page content       │
└─────────────────────────────────────┘
```

- Fully accessible: landmark `<header>` and `<main>`.
- Keyboard-navigable; skip-to-content link included.

### Component primitives (`components/ui/`)

Thin wrappers around `@nuxt/ui` that apply the enterprise token set:

| File | Wraps | Enterprise override |
|------|-------|---------------------|
| `AppButton.vue` | `UButton` | brand-500 primary, sm/md/lg sizes |
| `AppInput.vue`  | `UInput`  | border-DEFAULT ring-brand-500 focus |
| `AppCheckbox.vue` | `UCheckbox` | brand-500 checked color |
| `AppBadge.vue`  | `UBadge`  | surface.muted text-text-secondary |

### TDD: Required test cases (write tests first)

- `layouts/default.vue` renders a `<header>` and `<main>` landmark with correct classes.
- `AppButton` renders with `brand-500` background class when `variant="primary"`.
- `AppInput` has `ring-brand-500` focus class applied.
- `AppCheckbox` checked state applies `brand-500` colour token.
- Global CSS variables / Tailwind config resolve `brand.500` to the expected hex value.
