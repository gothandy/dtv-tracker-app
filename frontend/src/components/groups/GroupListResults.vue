<template>
  <div v-if="loading" class="gr-state">Loading groups…</div>
  <div v-else-if="error" class="gr-state gr-state--error">{{ error }}</div>
  <div v-else-if="!groups.length" class="gr-state">No groups found.</div>
  <div v-else class="gr-grid">
    <GroupCard v-for="g in groups" :key="g.key" :group="g" />
  </div>
</template>

<script setup lang="ts">
import GroupCard from './GroupCard.vue'
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

.gr-grid :deep(.group-card) { background: var(--color-dtv-sand); }
</style>
