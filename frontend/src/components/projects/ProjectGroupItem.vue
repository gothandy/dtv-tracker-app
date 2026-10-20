<template>
  <!-- A group that has worked on the project: a link to the group, with its hours on the project.
       The same pattern as a regular's card (RegularItem), but a link, not an edit button. -->
  <RouterLink :to="groupPath(group.groupKey)" class="pgi-card">
    <span class="pgi-name">{{ group.groupName }}</span>
    <strong class="pgi-hours">{{ formatHours(group.hours) }}h</strong>
  </RouterLink>
</template>

<script setup lang="ts">
import { groupPath } from '../../router/index'
import type { ProjectGroup } from '../../utils/projectGroups'

defineProps<{ group: ProjectGroup }>()

function formatHours(h: number): string {
  return h % 1 === 0 ? String(h) : h.toFixed(1)
}
</script>

<style scoped>
.pgi-card {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--color-dtv-sand);
  padding: 0.5rem 0.75rem;
  text-decoration: none;
}
.pgi-card:hover { background: var(--color-dtv-sand-dark); }

.pgi-name {
  flex: 1;
  font-size: 0.9rem;
  color: var(--color-text);
}

.pgi-hours {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-dtv-gold-dark);
  white-space: nowrap;
}
</style>
