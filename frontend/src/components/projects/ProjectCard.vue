<template>
  <div class="project-card">
    <div class="project-card__body">
      <p class="project-card__name">{{ project.displayName || project.key }}</p>
      <p v-if="project.description" class="project-card__description">{{ project.description }}</p>
    </div>
    <div class="project-card__footer">
      <div class="project-card__meta">
        <span><strong>{{ project.sessionCount }}</strong> sessions</span>
        <span><strong>{{ Math.round(project.hours) }}</strong> hrs</span>
      </div>
      <RouterLink :to="viewPath"><AppButton label="View" /></RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { projectPath } from '../../router/index'
import type { ProjectWithStats } from './ProjectListFilter.vue'
import AppButton from '../AppButton.vue'

const props = defineProps<{ project: ProjectWithStats }>()

const viewPath = computed(() => projectPath(props.project.key))
</script>

<style scoped>
.project-card {
  background: var(--color-dtv-light);
  display: flex;
  flex-direction: column;
}

.project-card__body {
  padding: 1rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.project-card__name {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-dtv-dark);
}

.project-card__description {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.4;
}

.project-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  background: var(--color-surface-hover);
  gap: 1rem;
}

.project-card__meta {
  display: flex;
  gap: 1rem;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}
</style>
