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
        <img v-if="g.eventbriteSeriesId" src="/svg/eventbrite.svg" class="gr-eb" alt="Eventbrite" title="Linked to Eventbrite" />
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
import { groupPath } from '../router/index'
import type { GroupWithStats } from './GroupsFilterV1.vue'

defineProps<{
  groups: GroupWithStats[]
  loading?: boolean
  error?: string | null
}>()
</script>

<style scoped>
.gr-state { text-align: center; padding: 3rem; color: #777; }
.gr-state--error { color: #d6472b; }

.gr-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}
@media (max-width: 900px) { .gr-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px) { .gr-grid { grid-template-columns: 1fr; } }

.gr-card {
  background: white;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  text-decoration: none;
  color: inherit;
  display: block;
  transition: transform 0.2s, box-shadow 0.2s;
}
.gr-card:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.15); }

.gr-card h3 {
  color: #333; margin: 0 0 0.5rem;
  font-size: 1.3rem;
  display: flex; align-items: center; gap: 0.4rem;
}
.gr-eb { width: 16px; height: 16px; }

.gr-description { color: #555; margin-bottom: 1rem; font-size: 0.95rem; line-height: 1.5; }

.gr-meta {
  display: flex; gap: 1rem; flex-wrap: wrap;
  font-size: 0.85rem; color: #777;
  border-top: 1px solid #eee; padding-top: 1rem;
}
.gr-meta-item { display: flex; align-items: center; gap: 0.3rem; }
.gr-meta-item strong { color: #4FAF4A; }
</style>
