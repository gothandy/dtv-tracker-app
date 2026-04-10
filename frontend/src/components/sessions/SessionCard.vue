<template>
  <div class="session-card">

    <div class="session-card__body">
      <p class="session-card__group">{{ session.groupName }}</p>
      <p class="session-card__date">{{ formatDate(session.date) }}</p>
      <p v-if="session.groupDescription" class="session-card__description prose">{{ session.groupDescription }}</p>
    </div>

    <div class="session-card__footer">
      <ul v-if="isOperational" class="session-card__stats">
        <li v-if="session.registrations || session.limits.total">
          {{ session.registrations }}<template v-if="session.limits.total">/{{ session.limits.total }}</template> Total
        </li>
        <li v-if="session.newCount || session.limits.new">
          {{ session.newCount ?? 0 }}<template v-if="session.limits.new">/{{ session.limits.new }}</template> New
        </li>
        <li v-if="repeatCount || session.limits.repeat">
          {{ repeatCount }}<template v-if="session.limits.repeat">/{{ session.limits.repeat }}</template> Repeat
        </li>
        <li v-if="session.regularCount || session.regularsCount">
          {{ session.regularCount ?? 0 }}<template v-if="session.regularsCount">/{{ session.regularsCount }}</template> Regular
        </li>
        <li v-if="session.childCount || session.limits.child">
          {{ session.childCount ?? 0 }}<template v-if="session.limits.child">/{{ session.limits.child }}</template> Child
        </li>
        <li v-if="session.eventbriteCount">{{ session.eventbriteCount }} Eventbrite</li>
      </ul>
      <span v-else class="session-card__availability" :class="availabilityClass">{{ availabilityLabel }}</span>
      <RouterLink :to="viewPath"><AppButton label="View" /></RouterLink>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { sessionPath } from '../../router/index'
import type { Session } from '../../types/session'
import AppButton from '../AppButton.vue'
import type { RoleContext } from '../../composables/useViewer'

const props = defineProps<{
  session: Session
  profile?: RoleContext
}>()

const isOperational = computed(() => props.profile?.isOperational ?? false)

const viewPath = computed(() => sessionPath(props.session.groupKey!, props.session.date))

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

const repeatCount = computed(() => Math.max(0, props.session.registrations - (props.session.newCount ?? 0) - (props.session.regularCount ?? 0)))
const spacesLeft = computed(() => props.session.limits.total !== undefined ? props.session.limits.total - props.session.registrations : null)

const availabilityLabel = computed(() => {
  const n = spacesLeft.value
  if (n === null) return 'Spaces Available'
  return n > 0 ? `${n} spaces available` : 'Fully Booked'
})

const availabilityClass = computed(() => ({
  'session-card__availability--full': spacesLeft.value !== null && spacesLeft.value <= 0,
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
  font-size: 1rem;
  color: var(--color-dtv-dark);
  margin-top: 0.25rem;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.session-card__footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 0.75rem 1.5rem;
}

.session-card__stats {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.5rem;
  font-size: 0.85rem;
  color: var(--color-dtv-dark);
}

.session-card__availability {
  font-size: 0.85rem;
  color: var(--color-dtv-green);
}

.session-card__availability--full {
  color: var(--color-dtv-dirt);
}
</style>
