<template>
  <div class="gh-header">
    <p v-if="group.description" class="gh-description">{{ group.description }}</p>
  </div>
</template>

<script setup lang="ts">
import type { GroupDetailResponse } from '../../../../types/api-responses'

defineProps<{ group: GroupDetailResponse }>()
</script>

<style scoped>
.gh-header {
  background: var(--color-white);
  padding: 1.25rem 1.5rem;
}


.gh-description {
  color: var(--color-text-secondary);
  margin-top: 0.5rem;
  margin-bottom: 0;
  line-height: 1.5;
}
</style>
