<template>
  <div class="list-item-card project-card">
    <div class="list-item-card__body">
      <p class="list-item-card__title">{{ project.displayName || project.key }}</p>
      <p v-if="trail" class="list-item-card__subtext">{{ trail }}</p>
      <p
        v-if="project.description"
        class="list-item-card__description prose"
        :class="{ 'list-item-card__description--short': trail }"
      >{{ project.description }}</p>
    </div>
    <div class="list-item-card__footer">
      <div class="list-item-card__stats">
        <span v-if="project.status"><strong>{{ project.status }}</strong></span>
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
import { trailName } from '../../utils/projectsByLocation'

const props = defineProps<{ project: ProjectWithStats }>()

const viewPath = computed(() => projectPath(props.project.key))
/** The trail it's at (its tags arrive as full paths from ProjectListFilter). */
const trail = computed(() => trailName(props.project.metadata))
</script>
