<template>
  <LoadingSpinner v-if="loading" />
  <div v-else-if="error" class="pr-state pr-state--error">{{ error }}</div>
  <div v-else-if="!projects.length" class="pr-state">No projects found.</div>
  <div v-else class="list-card-grid">
    <ProjectCard v-for="p in projects" :key="p.key" :project="p" />
  </div>
</template>

<script setup lang="ts">
import ProjectCard from './ProjectCard.vue'
import type { ProjectWithStats } from './ProjectListFilter.vue'
import LoadingSpinner from '../LoadingSpinner.vue'

defineProps<{
  projects: ProjectWithStats[]
  loading?: boolean
  error?: string | null
}>()
</script>

<style scoped>
.pr-state { text-align: center; padding: 3rem; color: var(--color-text-muted); }
.pr-state--error { color: var(--color-dtv-red); }
</style>
