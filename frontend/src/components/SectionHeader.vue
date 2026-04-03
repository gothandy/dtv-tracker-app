<template>
  <div v-if="!hidden" class="bg-white px-6 py-4 mt-4">
    <h2 class="text-dtv-green text-4xl leading-none"><slot /></h2>
  </div>
  <h2 v-else class="sr-only"><slot /></h2>
</template>

<script setup lang="ts">
defineProps<{ hidden?: boolean }>()
</script>