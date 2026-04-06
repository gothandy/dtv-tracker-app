<template>
  <div class="session-card">

    <div class="session-card__body">
      <p class="session-card__group">{{ session.groupName }}</p>
      <p class="session-card__date">{{ formatDate(session.date) }}</p>
      <p v-if="session.groupDescription" class="session-card__description">{{ session.groupDescription }}</p>
    </div>

    <div class="session-card__footer">
      <span class="session-card__availability" :class="availabilityClass">{{ availabilityLabel }}</span>
      <RouterLink :to="viewPath"><AppButton label="View" /></RouterLink>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { sessionPath } from '../../router/index'
import type { Session } from '../../types/session'
import AppButton from '../AppButton.vue'

const props = defineProps<{ session: Session }>()

const viewPath = computed(() => sessionPath(props.session.groupKey!, props.session.date))

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

const availabilityLabel = computed(() => {
  const n = props.session.spacesAvailable
  if (n == null) return ''
  return n > 0 ? `${n} spaces available` : 'Fully booked'
})

const availabilityClass = computed(() => ({
  'session-card__availability--full': props.session.spacesAvailable === 0,
}))
</script>

<style scoped>
.session-card {
  background: var(--color-dtv-light);
  display: flex;
  flex-direction: column;
}

.session-card__body {
  padding: 1rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.session-card__group {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-dtv-dark);
}

.session-card__date {
  font-size: 0.85rem;
  color: var(--color-dtv-dark);
}

.session-card__description {
  font-size: 0.85rem;
  color: var(--color-dtv-dark);
  margin-top: 0.25rem;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}

.session-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
}

.session-card__availability {
  font-size: 0.8rem;
  color: var(--color-dtv-green);
  font-weight: 600;
}

.session-card__availability--full {
  color: var(--color-dtv-dirt);
}

</style>
