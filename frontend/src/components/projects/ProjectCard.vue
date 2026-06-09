<template>
  <div class="list-item-card project-card">
    <div class="list-item-card__body">
      <p class="list-item-card__title">{{ project.displayName || project.key }}</p>
      <p v-if="project.description" class="list-item-card__description prose">{{ project.description }}</p>
    </div>
    <div class="list-item-card__footer">
      <div class="list-item-card__stats">
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
