<template>
  <div class="p-6">
    <h2 class="text-dtv-dark text-xl mb-4">What got done</h2>
    <p class="text-dtv-dark text-sm leading-relaxed" style="white-space: pre-line">{{ description }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ description: string }>()
</script>
