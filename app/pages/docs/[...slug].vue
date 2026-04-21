<template>
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
    <div class="flex gap-10">
      <!-- Article -->
      <article class="min-w-0 flex-1">
        <template v-if="page">
          <!-- Page header -->
          <header class="mb-8 pb-8 border-b border-slate-200 dark:border-slate-800">
            <div class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-3">
              <NuxtLink to="/" class="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                Home
              </NuxtLink>
              <UIcon name="i-heroicons-chevron-right" class="h-3.5 w-3.5" />
              <NuxtLink to="/docs/getting-started" class="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                Docs
              </NuxtLink>
              <UIcon name="i-heroicons-chevron-right" class="h-3.5 w-3.5" />
              <span class="text-slate-700 dark:text-slate-300">{{ page.title }}</span>
            </div>

            <h1 class="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-3">
              {{ page.title }}
            </h1>

            <p
              v-if="page.description"
              class="text-lg text-slate-500 dark:text-slate-400 leading-relaxed"
            >
              {{ page.description }}
            </p>
          </header>

          <!-- Content -->
          <div class="prose prose-slate dark:prose-invert max-w-none">
            <ContentRenderer :value="page" />
          </div>

          <!-- Prev / Next navigation -->
          <nav
            class="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-4"
            aria-label="Document navigation"
          >
            <NuxtLink
              v-if="prev"
              :to="prev.path"
              class="flex-1 flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all group"
            >
              <UIcon
                name="i-heroicons-arrow-left"
                class="h-4 w-4 shrink-0 text-slate-400 group-hover:text-blue-500 transition-colors"
              />
              <div class="min-w-0">
                <div class="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Previous</div>
                <div class="text-sm font-medium text-slate-700 dark:text-slate-300 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {{ prev.title }}
                </div>
              </div>
            </NuxtLink>

            <div v-if="!prev" class="flex-1" />

            <NuxtLink
              v-if="next"
              :to="next.path"
              class="flex-1 flex items-center justify-end gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all group text-right"
            >
              <div class="min-w-0">
                <div class="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Next</div>
                <div class="text-sm font-medium text-slate-700 dark:text-slate-300 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {{ next.title }}
                </div>
              </div>
              <UIcon
                name="i-heroicons-arrow-right"
                class="h-4 w-4 shrink-0 text-slate-400 group-hover:text-blue-500 transition-colors"
              />
            </NuxtLink>
          </nav>
        </template>

        <!-- 404 state -->
        <template v-else>
          <div class="flex flex-col items-center justify-center py-24 text-center">
            <div class="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
              <UIcon name="i-heroicons-document-magnifying-glass" class="h-7 w-7 text-slate-400" />
            </div>
            <h1 class="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
              Page not found
            </h1>
            <p class="text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
              The documentation page you are looking for does not exist or may have been moved.
            </p>
            <UButton to="/docs/getting-started" icon="i-heroicons-arrow-left">
              Back to Getting Started
            </UButton>
          </div>
        </template>
      </article>

      <!-- Table of contents (desktop) -->
      <aside
        v-if="page && toc && toc.links && toc.links.length > 0"
        class="hidden xl:block w-56 shrink-0"
      >
        <div class="sticky top-24">
          <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
            On this page
          </p>
          <nav class="flex flex-col gap-0.5" aria-label="Table of contents">
            <a
              v-for="link in toc.links"
              :key="link.id"
              :href="`#${link.id}`"
              class="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 py-1 transition-colors truncate"
            >
              {{ link.text }}
            </a>
          </nav>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const route = useRoute()

// Build the content path from the slug catch-all
const slug = computed(() => {
  const s = route.params.slug
  return Array.isArray(s) ? s.join('/') : (s ?? 'index')
})

const { data: page } = await useAsyncData(`docs-${slug.value}`, () =>
  queryCollection('docs').path(`/docs/${slug.value}`).first(),
)

// Table of contents lives on the parsed content body
const toc = computed(() => page.value?.body?.toc ?? null)

// Surrounding pages for prev/next navigation
const { data: surroundData } = await useAsyncData(`docs-surround-${slug.value}`, () =>
  queryCollectionItemSurroundings('docs', `/docs/${slug.value}`, {
    fields: ['title', 'path'],
  }),
)

const prev = computed(() => surroundData.value?.[0] ?? null)
const next = computed(() => surroundData.value?.[1] ?? null)

// SEO
useSeoMeta({
  title: page.value?.title ?? 'Documentation',
  description: page.value?.description ?? '',
})
</script>
