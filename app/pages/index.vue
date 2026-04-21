<template>
  <div>
    <!-- Hero -->
    <section class="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 py-20 sm:py-28">
      <!-- Background grid pattern -->
      <div
        class="absolute inset-0 opacity-10"
        style="background-image: linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px); background-size: 40px 40px;"
        aria-hidden="true"
      />

      <div class="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <UBadge color="blue" variant="subtle" size="md" class="mb-6">
          <UIcon name="i-heroicons-sparkles" class="mr-1 h-3.5 w-3.5" />
          Built with Nuxt 4
        </UBadge>

        <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6">
          Enterprise
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
            Documentation
          </span>
          Platform
        </h1>

        <p class="mx-auto max-w-2xl text-lg sm:text-xl text-slate-300 mb-10 leading-relaxed">
          A production-ready platform for your enterprise documentation, built on Nuxt 4,
          Nuxt UI, and Nuxt Content. Fast, accessible, and beautifully crafted.
        </p>

        <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
          <UButton
            to="/docs/getting-started"
            size="xl"
            color="blue"
            icon="i-heroicons-rocket-launch"
            trailing
          >
            Get Started
          </UButton>
          <UButton
            to="https://github.com"
            target="_blank"
            size="xl"
            variant="outline"
            color="white"
            icon="i-simple-icons-github"
          >
            View on GitHub
          </UButton>
        </div>
      </div>
    </section>

    <!-- Stats bar -->
    <section class="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-200 dark:divide-slate-800">
          <div
            v-for="stat in stats"
            :key="stat.label"
            class="flex flex-col items-center py-6 px-4"
          >
            <span class="text-2xl font-bold text-slate-900 dark:text-white">{{ stat.value }}</span>
            <span class="text-sm text-slate-500 dark:text-slate-400 mt-1">{{ stat.label }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="py-16 sm:py-24 bg-slate-50 dark:bg-slate-950">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-14">
          <h2 class="section-heading text-3xl sm:text-4xl mb-4">
            Everything you need
          </h2>
          <p class="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto">
            A complete toolkit for building enterprise-grade documentation and internal tooling.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="feature in features"
            :key="feature.title"
            class="card-enterprise p-6 flex flex-col gap-4 group"
          >
            <div
              :class="feature.iconBg"
              class="inline-flex h-10 w-10 items-center justify-center rounded-lg"
            >
              <UIcon :name="feature.icon" class="h-5 w-5" :class="feature.iconColor" />
            </div>
            <div>
              <h3 class="font-semibold text-slate-900 dark:text-white mb-1.5">
                {{ feature.title }}
              </h3>
              <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {{ feature.description }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="py-16 sm:py-20 bg-blue-600 dark:bg-blue-700">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 class="text-3xl font-bold text-white mb-4">
          Ready to get started?
        </h2>
        <p class="text-blue-100 mb-8 text-lg max-w-xl mx-auto">
          Explore the documentation to learn how to configure, customize, and deploy your enterprise platform.
        </p>
        <UButton
          to="/docs/getting-started"
          size="xl"
          color="white"
          variant="solid"
          icon="i-heroicons-arrow-right"
          trailing
        >
          Read the Docs
        </UButton>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

useSeoMeta({
  title: 'Home',
  description: 'Enterprise documentation platform built with Nuxt 4, Nuxt UI, and Nuxt Content.',
})

const stats = [
  { value: '100%', label: 'TypeScript' },
  { value: 'A11y', label: 'Accessible' },
  { value: 'SSG', label: 'Static ready' },
  { value: 'v4', label: 'Nuxt 4' },
]

const features = [
  {
    title: 'Markdown First',
    description:
      'Write documentation in Markdown with full MDC component support, syntax highlighting via Shiki, and auto-generated table of contents.',
    icon: 'i-heroicons-document-text',
    iconBg: 'bg-blue-50 dark:bg-blue-950/50',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    title: 'Enterprise UI',
    description:
      'Built on Nuxt UI v4 and Tailwind CSS. Every component is accessible, themeable, and production-ready out of the box.',
    icon: 'i-heroicons-swatch',
    iconBg: 'bg-violet-50 dark:bg-violet-950/50',
    iconColor: 'text-violet-600 dark:text-violet-400',
  },
  {
    title: 'Dark Mode',
    description:
      'First-class dark mode support powered by @nuxtjs/color-mode. Respects system preferences with a manual override.',
    icon: 'i-heroicons-moon',
    iconBg: 'bg-slate-100 dark:bg-slate-800',
    iconColor: 'text-slate-600 dark:text-slate-300',
  },
  {
    title: 'Type-Safe',
    description:
      'Full TypeScript throughout — components, composables, content schemas, and API routes are all strongly typed.',
    icon: 'i-heroicons-code-bracket-square',
    iconBg: 'bg-sky-50 dark:bg-sky-950/50',
    iconColor: 'text-sky-600 dark:text-sky-400',
  },
  {
    title: 'Fast & Optimized',
    description:
      'Static site generation, image optimisation, route-level code splitting, and edge-ready deployment out of the box.',
    icon: 'i-heroicons-bolt',
    iconBg: 'bg-amber-50 dark:bg-amber-950/50',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    title: 'Search Ready',
    description:
      'Nuxt Content provides built-in full-text search across all your markdown files with zero configuration required.',
    icon: 'i-heroicons-magnifying-glass',
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/50',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
]
</script>
