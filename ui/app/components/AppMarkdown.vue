<script setup lang="ts">
/**
 * AppMarkdown — inline markdown renderer.
 *
 * Renders arbitrary markdown strings as HTML with full prose styling.
 * Uses @nuxt/content's MDC parser under the hood so GFM, syntax
 * highlighting, and table extensions are all supported.
 *
 * Usage:
 *   <AppMarkdown :source="todo.description" />
 */

interface Props {
  /** Markdown source string */
  source: string
  /** Restrict to inline elements only (no block wrapping) */
  inline?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  inline: false,
})

const { data: parsed } = await useAsyncData(
  `md-${hashString(props.source)}`,
  () => parseMarkdown(props.source),
)

/** Tiny deterministic hash for cache-key stability */
function hashString(str: string): string {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return h.toString(36)
}
</script>

<template>
  <div :class="['app-markdown', { 'app-markdown--inline': inline, prose: !inline }]">
    <MDCRenderer v-if="parsed" :body="parsed.body" :data="parsed.data" />
  </div>
</template>

<style scoped>
.app-markdown {
  /* Inherits .prose styles from global stylesheet when not inline */
}

.app-markdown--inline {
  display: inline;
}

.app-markdown--inline :deep(p) {
  display: inline;
  margin: 0;
}
</style>
