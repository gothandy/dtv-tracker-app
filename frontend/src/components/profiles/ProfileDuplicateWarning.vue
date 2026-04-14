<template>
  <div v-if="duplicates.length" class="pdw-wrap">
    <p class="pdw-heading">Possible duplicates</p>
    <div
      v-for="d in duplicates"
      :key="d.id"
      class="pdw-card"
      :class="`pdw-card--${d.severity}`"
    >
      <div class="pdw-card-body">
        <RouterLink :to="profilePath(d.slug)" class="pdw-name">{{ d.name }}</RouterLink>
        <span v-if="d.email" class="pdw-email">{{ d.email }}</span>
      </div>
      <span class="pdw-label">{{ severityLabel(d.severity) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { ProfileDuplicateResponse } from '../../../../types/api-responses'
import { profilePath } from '../../router/index'

defineProps<{
  duplicates: ProfileDuplicateResponse[]
}>()

function severityLabel(severity: ProfileDuplicateResponse['severity']): string {
  if (severity === 'red') return 'Likely duplicate — same name and email'
  if (severity === 'orange') return 'Possible duplicate — same name, different email'
  return 'Similar profile — different display name'
}
</script>

<style scoped>
.pdw-wrap {
  padding: 1rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pdw-heading {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  margin: 0;
}

.pdw-card {
  padding: 0.6rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.pdw-card--red    { background: var(--color-dtv-dirt); color: var(--color-white); }
.pdw-card--orange { background: var(--color-dtv-gold); color: var(--color-white); }
.pdw-card--green  { background: var(--color-dtv-sand); }

.pdw-card-body {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.pdw-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-dtv-dark);
  text-decoration: none;
}
.pdw-name:hover { text-decoration: underline; }


.pdw-email {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.pdw-card--red .pdw-email,
.pdw-card--orange .pdw-email {
  color: rgba(255, 255, 255, 0.8);
}

.pdw-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.pdw-card--red .pdw-label,
.pdw-card--orange .pdw-label {
  color: rgba(255, 255, 255, 0.75);
}
</style>
