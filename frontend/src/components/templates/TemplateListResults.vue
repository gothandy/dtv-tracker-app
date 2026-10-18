<template>
  <LoadingSpinner v-if="loading" />
  <div v-else-if="error" class="tr-state tr-state--error">{{ error }}</div>
  <div v-else-if="!templates.length" class="tr-state">No templates found.</div>
  <div v-else class="list-card-grid">
    <TemplateCard v-for="t in templates" :key="t.id" :template="t" />
  </div>
</template>

<script setup lang="ts">
import TemplateCard from './TemplateCard.vue'
import LoadingSpinner from '../LoadingSpinner.vue'
import type { TemplateResponse } from '../../../../types/api-responses'

defineProps<{
  templates: TemplateResponse[]
  loading?: boolean
  error?: string | null
}>()
</script>

<style scoped>
.tr-state { text-align: center; padding: 3rem; color: var(--color-text-muted); }
.tr-state--error { color: var(--color-dtv-red); }
</style>
