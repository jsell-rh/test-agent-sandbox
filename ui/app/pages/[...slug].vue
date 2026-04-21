<script setup lang="ts">
// Catch-all route for @nuxt/content markdown pages.
// Any file under content/ is rendered here with full prose styling.

const route = useRoute()

const { data: page, error } = await useAsyncData(
  `content-${route.path}`,
  () => queryCollection('content').path(route.path).first(),
)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found' })
}
</script>

<template>
  <article class="prose" aria-live="polite">
    <ContentRenderer v-if="page" :value="page" />
    <div v-else class="not-found">
      <p>Page not found.</p>
    </div>
  </article>
</template>

<style scoped>
.not-found {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}
</style>
