<template>
  <div class="gh-header">
    <div class="gh-title-row">
      <h2>{{ group.displayName || group.key }}</h2>
      <img v-if="group.eventbriteSeriesId && showEbLink" src="/svg/eventbrite.svg" class="gh-eb-icon" alt="Eventbrite" :title="'Eventbrite series: ' + group.eventbriteSeriesId" />
    </div>
    <p v-if="group.description" class="gh-description">{{ group.description }}</p>
  </div>
</template>

<script setup lang="ts">
import type { GroupDetailResponse } from '../../../../types/api-responses'

defineProps<{ group: GroupDetailResponse, showEbLink?: boolean }>()
</script>

<style scoped>
.gh-header {
  background: var(--color-white);
  padding: 1.25rem 1.5rem;
}

.gh-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.gh-title-row h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.gh-eb-icon { width: 18px; height: 18px; opacity: 0.7; }

.gh-description {
  color: var(--color-text-secondary);
  margin-top: 0.5rem;
  margin-bottom: 0;
  line-height: 1.5;
}
</style>
