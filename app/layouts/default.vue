<template>
  <div class="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
    <!-- Top navigation -->
    <AppNavbar />

    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar (visible on lg+) -->
      <aside
        v-if="hasSidebar"
        class="hidden lg:flex flex-col w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto"
      >
        <div class="sticky top-0 p-4">
          <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 px-3">
            Documentation
          </p>
          <nav class="flex flex-col gap-0.5">
            <NuxtLink
              v-for="link in sidebarLinks"
              :key="link.to"
              :to="link.to"
              class="sidebar-link"
              active-class="sidebar-link-active"
            >
              <UIcon :name="link.icon" class="h-4 w-4 shrink-0" />
              <span>{{ link.label }}</span>
            </NuxtLink>
          </nav>

          <div class="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
            <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 px-3">
              Resources
            </p>
            <nav class="flex flex-col gap-0.5">
              <a
                v-for="link in externalLinks"
                :key="link.href"
                :href="link.href"
                target="_blank"
                rel="noopener noreferrer"
                class="sidebar-link"
              >
                <UIcon :name="link.icon" class="h-4 w-4 shrink-0" />
                <span>{{ link.label }}</span>
                <UIcon name="i-heroicons-arrow-top-right-on-square" class="h-3 w-3 ml-auto opacity-50" />
              </a>
            </nav>
          </div>
        </div>
      </aside>

      <!-- Main content -->
      <main class="flex-1 min-w-0 overflow-auto">
        <slot />
      </main>
    </div>

    <!-- Footer -->
    <footer class="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <UIcon name="i-heroicons-cube-transparent" class="h-4 w-4 text-blue-600" />
            <span>Enterprise Platform &copy; {{ currentYear }}</span>
          </div>

          <div class="flex items-center gap-4">
            <a
              v-for="link in footerLinks"
              :key="link.href"
              :href="link.href"
              target="_blank"
              rel="noopener noreferrer"
              class="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            >
              {{ link.label }}
            </a>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()

// Show sidebar only on /docs routes
const hasSidebar = computed(() => route.path.startsWith('/docs'))

const currentYear = new Date().getFullYear()

const sidebarLinks = [
  { to: '/docs/getting-started', label: 'Getting Started', icon: 'i-heroicons-rocket-launch' },
  { to: '/docs/configuration', label: 'Configuration', icon: 'i-heroicons-cog-6-tooth' },
  { to: '/docs/components', label: 'Components', icon: 'i-heroicons-squares-2x2' },
  { to: '/docs/api', label: 'API Reference', icon: 'i-heroicons-code-bracket' },
  { to: '/docs/deployment', label: 'Deployment', icon: 'i-heroicons-cloud-arrow-up' },
] as const

const externalLinks = [
  { href: 'https://nuxt.com', label: 'Nuxt Docs', icon: 'i-simple-icons-nuxtdotjs' },
  { href: 'https://ui.nuxt.com', label: 'Nuxt UI', icon: 'i-heroicons-swatch' },
  { href: 'https://content.nuxt.com', label: 'Nuxt Content', icon: 'i-heroicons-document-text' },
]

const footerLinks = [
  { href: 'https://nuxt.com/docs', label: 'Nuxt Docs' },
  { href: 'https://github.com', label: 'GitHub' },
  { href: 'https://ui.nuxt.com', label: 'Nuxt UI' },
]
</script>
