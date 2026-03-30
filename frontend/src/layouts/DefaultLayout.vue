<template>
  <div class="min-h-screen flex flex-col">
    <AppHeader />
    <main class="flex-1 bg-white">
      <div :class="padded ? 'max-w-5xl mx-auto px-4 pt-6 pb-8' : 'max-w-5xl mx-auto pt-6 pb-8'">
        <slot />
      </div>
    </main>
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import AppHeader from '../components/AppHeader.vue'
import AppFooter from '../components/AppFooter.vue'

withDefaults(defineProps<{ padded?: boolean }>(), { padded: true })
</script>
