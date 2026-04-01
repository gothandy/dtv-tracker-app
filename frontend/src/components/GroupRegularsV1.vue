<template>
  <!-- Trusted: full regulars list -->
  <div v-if="isTrusted && group.regulars.length > 0" class="gr-section">
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
  <div v-else-if="isSelfService && group.isCurrentUserRegular" class="gr-section gr-self">
    <span>✓ You are a regular volunteer for this group</span>
  </div>
</template>

<script setup lang="ts">
import { useRole } from '../composables/useRole'
import { profilePath } from '../router/index'
import type { GroupDetailResponse } from '../../../types/api-responses'

defineProps<{ group: GroupDetailResponse }>()

const { isTrusted, isSelfService } = useRole()
</script>

<style scoped>
.gr-section {
  background: white;
  padding: 1rem 1.5rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 1.5rem;
}

.gr-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.gr-title-row h3 { font-size: 1rem; font-weight: 700; color: #333; margin: 0; }

.gr-count {
  background: #eee; color: #666;
  font-size: 0.8rem; font-weight: 600;
  padding: 0.15rem 0.5rem;
}

.gr-list { display: flex; flex-wrap: wrap; gap: 0.5rem; }

.gr-item {
  background: #f5f5f5;
  color: #3d9a3d;
  text-decoration: none;
  padding: 0.25rem 0.6rem;
  font-size: 0.85rem;
  font-weight: 600;
}

.gr-item:hover { background: #eef8ee; }

.gr-self {
  color: #3d9a3d;
  font-weight: 600;
  font-size: 0.9rem;
}
</style>
