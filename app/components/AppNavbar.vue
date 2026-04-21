<template>
  <header
    class="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md"
  >
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="flex h-16 items-center justify-between">
        <!-- Logo + wordmark -->
        <div class="flex items-center gap-3">
          <NuxtLink to="/" class="flex items-center gap-2 group" aria-label="Home">
            <div
              class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 shadow-sm group-hover:bg-blue-700 transition-colors"
            >
              <UIcon name="i-heroicons-cube-transparent" class="h-5 w-5 text-white" />
            </div>
            <span class="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
              Enterprise
              <span class="text-blue-600 dark:text-blue-400">Platform</span>
            </span>
          </NuxtLink>
        </div>

        <!-- Desktop nav -->
        <nav class="hidden md:flex items-center gap-1" aria-label="Main navigation">
          <NuxtLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="nav-link px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
            active-class="nav-link-active bg-blue-50 dark:bg-blue-950/50"
          >
            {{ link.label }}
          </NuxtLink>
        </nav>

        <!-- Right-side actions -->
        <div class="flex items-center gap-2">
          <!-- Color-mode toggle -->
          <UButton
            :icon="colorModeIcon"
            variant="ghost"
            color="neutral"
            size="sm"
            :aria-label="`Switch to ${isDark ? 'light' : 'dark'} mode`"
            @click="toggleColorMode"
          />

          <!-- GitHub link (example external action) -->
          <UButton
            icon="i-simple-icons-github"
            variant="ghost"
            color="neutral"
            size="sm"
            aria-label="GitHub repository"
            to="https://github.com"
            target="_blank"
            class="hidden sm:flex"
          />

          <!-- Mobile menu toggle -->
          <UButton
            :icon="mobileMenuOpen ? 'i-heroicons-x-mark' : 'i-heroicons-bars-3'"
            variant="ghost"
            color="neutral"
            size="sm"
            class="md:hidden"
            aria-label="Toggle mobile menu"
            @click="mobileMenuOpen = !mobileMenuOpen"
          />
        </div>
      </div>
    </div>

    <!-- Mobile menu -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="mobileMenuOpen"
        class="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3"
      >
        <nav class="flex flex-col gap-1" aria-label="Mobile navigation">
          <NuxtLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="sidebar-link"
            active-class="sidebar-link-active"
            @click="mobileMenuOpen = false"
          >
            <UIcon :name="link.icon" class="h-4 w-4" />
            {{ link.label }}
          </NuxtLink>
        </nav>
      </div>
    </Transition>
  </header>
</template>

<script setup lang="ts">
const colorMode = useColorMode()
const mobileMenuOpen = ref(false)

const isDark = computed(() => colorMode.value === 'dark')

const colorModeIcon = computed(() =>
  isDark.value ? 'i-heroicons-sun' : 'i-heroicons-moon',
)

function toggleColorMode() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}

const navLinks = [
  { to: '/', label: 'Home', icon: 'i-heroicons-home' },
  { to: '/docs/getting-started', label: 'Docs', icon: 'i-heroicons-book-open' },
] as const

// Close mobile menu on route change
const route = useRoute()
watch(() => route.fullPath, () => {
  mobileMenuOpen.value = false
})
</script>
