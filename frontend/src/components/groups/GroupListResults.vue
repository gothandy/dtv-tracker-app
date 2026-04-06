<template>
  <div v-if="loading" class="gr-state">Loading groups…</div>
  <div v-else-if="error" class="gr-state gr-state--error">{{ error }}</div>
  <div v-else-if="!groups.length" class="gr-state">No groups found.</div>
  <div v-else class="gr-grid">
    <RouterLink
      v-for="g in groups"
      :key="g.key"
      :to="groupPath(g.key)"
      class="gr-card"
    >
      <h3>
        {{ g.displayName || g.key }}
        <img v-if="g.eventbriteSeriesId" src="/icons/eventbrite.svg" class="gr-eb" alt="Eventbrite" title="Linked to Eventbrite" />
      </h3>
      <div v-if="g.description" class="gr-description">{{ g.description }}</div>
      <div class="gr-meta">
        <div v-if="g.regularsCount > 0" class="gr-meta-item"><strong>{{ g.regularsCount }}</strong> regulars</div>
        <div class="gr-meta-item"><strong>{{ g.sessionCount }}</strong> sessions</div>
        <div class="gr-meta-item"><strong>{{ g.hours }}</strong> hrs</div>
      </div>
    </RouterLink>
  </div>
</template>

<script setup lang="ts">
import { groupPath } from '../../router/index'
import type { GroupWithStats } from './GroupListFilter.vue'

defineProps<{
  groups: GroupWithStats[]
  loading?: boolean
  error?: string | null
}>()
</script>

<style scoped>
.gr-state { text-align: center; padding: 3rem; color: var(--color-text-muted); }
.gr-state--error { color: var(--color-dtv-red); }

.gr-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}
@media (width < 48em) { .gr-grid { grid-template-columns: 1fr; } }

.gr-card {
  background: var(--color-white);
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  text-decoration: none;
  color: inherit;
  display: block;
  transition: transform 0.2s, box-shadow 0.2s;
}
.gr-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }

.gr-card h3 {
  color: var(--color-text); margin: 0 0 0.5rem;
  font-size: 1.3rem;
  display: flex; align-items: center; gap: 0.4rem;
}
.gr-eb { width: 16px; height: 16px; }

.gr-description { color: var(--color-text-secondary); margin-bottom: 1rem; font-size: 0.95rem; line-height: 1.5; }

.gr-meta {
  display: flex; gap: 1rem; flex-wrap: wrap;
  font-size: 0.85rem; color: var(--color-text-muted);
  border-top: 1px solid var(--color-surface-subtle); padding-top: 1rem;
}
.gr-meta-item { display: flex; align-items: center; gap: 0.3rem; }
.gr-meta-item strong { color: var(--color-dtv-green); }
</style>
