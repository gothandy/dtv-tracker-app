<template>
  <div class="sna-wrap">
    <p class="sna-status">No spaces available for your booking type.</p>
    <AppButton usage="task" label="Find more sessions" :href="groupPath(groupKey)" />
  </div>
</template>

<script setup lang="ts">
import AppButton from '../../AppButton.vue'
import { groupPath } from '../../../router/index'
defineProps<{ groupKey: string }>()
</script>

<style scoped>
.sna-wrap {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  text-align: center;
}

.sna-status {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  margin: 0;
}
</style>
