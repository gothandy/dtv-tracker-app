<template>
  <RouterLink :to="to" class="docs-folder-link">
    {{ label }}
  </RouterLink>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'

defineProps<{
  label: string
  to: string
}>()
</script>

<style scoped>
.docs-folder-link {
  display: block;
  padding: 0.85rem 1rem;
  background: var(--color-dtv-sand);
  color: var(--color-dtv-dark);
  font-size: 1rem;
  font-weight: 700;
  text-decoration: none;
}

.docs-folder-link:hover {
  background: var(--color-dtv-sand-dark);
  text-decoration: underline;
}
</style>
