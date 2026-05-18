<script setup lang="ts">
const { notifications, dismissNotification } = useTodos()
</script>

<template>
  <div class="min-h-screen bg-gray-50 font-sans antialiased">
    <NuxtPage />

    <!-- Global notification overlay -->
    <AppNotification
      :notifications="notifications"
      @dismiss="dismissNotification"
    />
  </div>
</template>
