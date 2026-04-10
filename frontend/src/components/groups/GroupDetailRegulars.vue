<template>
  <!-- Admin / check-in: full regulars list -->
  <div v-if="(profile.isAdmin || profile.isCheckIn) && group.regulars.length > 0" class="gr-section">
    <div class="gr-title-row">
      <h3>Regulars</h3>
      <span class="gr-count">{{ group.regulars.length }}</span>
    </div>
    <div class="gr-list">
      <RouterLink
        v-for="r in group.regulars"
        :key="r.slug"
        :to="profilePath(r.slug)"
        class="gr-item"
      >{{ r.name }}</RouterLink>
    </div>
  </div>

  <!-- Self-service: personalised message -->
  <div v-else-if="profile.isSelfService && group.isCurrentUserRegular" class="gr-section gr-self">
    <span>✓ You are a regular volunteer for this group</span>
  </div>
</template>

<script setup lang="ts">
import { useViewer } from '../../composables/useViewer'
import { profilePath } from '../../router/index'
import type { GroupDetailResponse } from '../../../../types/api-responses'

defineProps<{ group: GroupDetailResponse }>()

const profile = useViewer()
</script>

<style scoped>
.gr-section {
  background: var(--color-white);
  padding: 1rem 1.5rem;
  box-shadow: var(--shadow-sm);
  margin-bottom: 1.5rem;
}

.gr-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.gr-title-row h3 { font-size: 1rem; font-weight: 700; color: var(--color-text); margin: 0; }

.gr-count {
  background: var(--color-surface-subtle); color: var(--color-text-label);
  font-size: 0.8rem; font-weight: 600;
  padding: 0.15rem 0.5rem;
}

.gr-list { display: flex; flex-wrap: wrap; gap: 0.5rem; }

.gr-item {
  background: var(--color-surface-hover);
  color: var(--color-green-hover);
  text-decoration: none;
  padding: 0.25rem 0.6rem;
  font-size: 0.85rem;
  font-weight: 600;
}

.gr-item:hover { background: var(--color-green-tint); }

.gr-self {
  color: var(--color-green-hover);
  font-weight: 600;
  font-size: 0.9rem;
}
</style>
