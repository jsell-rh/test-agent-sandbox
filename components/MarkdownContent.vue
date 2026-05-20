<template>
  <!-- Renders inline markdown safely. Used for todo titles. -->
  <span class="prose prose-sm dark:prose-invert max-w-none break-words" v-html="renderedHtml" />
</template>

<script setup lang="ts">
import { marked, Renderer } from 'marked'

const props = defineProps<{
  /** Raw markdown string to render. */
  content: string
}>()

/**
 * Create a renderer that escapes raw HTML instead of passing it through.
 * This prevents XSS via todo titles containing tags like <script> or event
 * handler attributes (onclick=...).
 */
const safeRenderer = new Renderer()
// In marked v15, html tokens are passed as { text, raw, pre } objects.
// We escape rather than render raw HTML to prevent XSS.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
safeRenderer.html = (token: any) => {
  const raw: string = typeof token === 'string' ? token : (token.text ?? token.raw ?? '')
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

/**
 * Parse markdown as inline content so titles aren't wrapped in a <p>.
 * marked.parseInline returns a string synchronously.
 * HTML pass-through is disabled via the custom renderer to prevent XSS.
 */
const renderedHtml = computed<string>(
  () => marked.parseInline(props.content, { renderer: safeRenderer }) as string,
)
</script>
