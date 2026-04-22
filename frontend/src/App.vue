<template>
  <RouterView />
</template>

<script setup lang="ts">
import { useViewportHeight } from './composables/useViewportHeight'

useViewportHeight()
</script>
