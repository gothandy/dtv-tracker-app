<template>
  <!-- The groups that have worked on the project: the layout of Repeats and Regulars (RegularList),
       each a ProjectGroupItem linking through to the group. -->
  <div class="rl-wrap">
    <div class="rl-header">
      <h2 class="rl-title">Groups</h2>
    </div>

    <p v-if="!groups.length" class="rl-empty">No groups have worked on this project yet.</p>

    <div v-else class="rl-grid">
      <ProjectGroupItem v-for="g in groups" :key="g.groupKey" :group="g" />
    </div>
  </div>
</template>

<script setup lang="ts">
import ProjectGroupItem from './ProjectGroupItem.vue'
import type { ProjectGroup } from '../../utils/projectGroups'

defineProps<{ groups: ProjectGroup[] }>()
</script>

<style scoped>
/* As RegularList. */
.rl-wrap {
  background: var(--color-white);
  padding: 1.25rem 1.5rem;
}

.rl-header {
  margin-bottom: 0.75rem;
}

.rl-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.rl-empty {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  margin: 0;
}

.rl-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
