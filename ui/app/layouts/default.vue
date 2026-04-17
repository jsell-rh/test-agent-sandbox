<script setup lang="ts">
const config = useRuntimeConfig()
const appName = config.public.appName as string
</script>

<template>
  <div class="app-shell">
    <!-- Accessibility: skip-to-content -->
    <a href="#main-content" class="skip-link">Skip to content</a>

    <!-- Brand header -->
    <header class="app-header" role="banner">
      <div class="app-header__inner">
        <NuxtLink to="/" class="app-header__brand" aria-label="Todos — home">
          {{ appName }}
        </NuxtLink>
        <nav class="app-header__nav" aria-label="Primary navigation">
          <slot name="nav" />
        </nav>
      </div>
    </header>

    <!-- Main content area -->
    <main id="main-content" class="app-main" role="main" tabindex="-1">
      <div class="app-main__container">
        <slot />
      </div>
    </main>

    <!-- Footer -->
    <footer class="app-footer" role="contentinfo">
      <div class="app-footer__inner">
        <span class="app-footer__copy">
          &copy; {{ new Date().getFullYear() }} {{ appName }}
        </span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* ------------------------------------------------------------------ */
/* App shell                                                            */
/* ------------------------------------------------------------------ */
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.06);
}

.app-header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 80rem;
  margin: 0 auto;
  padding: 0 1.5rem;
  height: 4rem;
}

.app-header__brand {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-brand-900);
  text-decoration: none;
  letter-spacing: -0.025em;
  transition: color var(--transition-fast);
}

.app-header__brand:hover {
  color: var(--color-brand-600);
}

.app-header__nav {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */
.app-main {
  flex: 1;
  outline: none;
}

.app-main__container {
  max-width: 42rem;
  margin: 0 auto;
  padding: 2rem 1rem;
}

/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */
.app-footer {
  border-top: 1px solid var(--color-border);
  background-color: var(--color-surface);
}

.app-footer__inner {
  max-width: 80rem;
  margin: 0 auto;
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.app-footer__copy {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}
</style>
