<template>
  <div class="group-card">

    <div class="group-card__body">
      <p class="group-card__name">
        {{ group.displayName || group.key }}
        <img v-if="group.eventbriteSeriesId" src="/icons/brands/eventbrite.svg" class="group-card__eb" alt="Eventbrite" title="Linked to Eventbrite" />
      </p>
      <p v-if="group.description" class="group-card__description">{{ group.description }}</p>
    </div>

    <div class="group-card__footer">
      <div class="group-card__meta">
        <span v-if="group.regularsCount > 0"><strong>{{ group.regularsCount }}</strong> regulars</span>
        <span><strong>{{ group.sessionCount }}</strong> sessions</span>
        <span><strong>{{ Math.round(group.hours) }}</strong> hrs</span>
      </div>
      <RouterLink :to="viewPath"><AppButton label="View" /></RouterLink>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { groupPath } from '../../router/index'
import type { GroupWithStats } from './GroupListFilter.vue'
import AppButton from '../AppButton.vue'

const props = defineProps<{ group: GroupWithStats }>()

const viewPath = computed(() => groupPath(props.group.key))
</script>

<style scoped>
.group-card {
  background: var(--color-dtv-light);
  display: flex;
  flex-direction: column;
}

.group-card__body {
  padding: 1rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.group-card__name {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-dtv-dark);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.group-card__eb {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.group-card__description {
  font-size: 0.85rem;
  color: var(--color-dtv-dark);
  margin-top: 0.25rem;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}

.group-card__footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
}

.group-card__meta {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.8rem;
  color: var(--color-dtv-green);
}

.group-card__meta strong {
  font-weight: 700;
}
</style>
