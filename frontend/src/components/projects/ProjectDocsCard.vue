<template>
  <div class="pdc-card">
    <h3 class="pdc-title">Documents</h3>
    <LoadingSpinner v-if="loading" />
    <p v-else-if="!attachments.length" class="pdc-empty">No documents attached.</p>
    <ul v-else class="pdc-list">
      <li v-for="doc in attachments" :key="doc.webUrl">
        <a :href="doc.webUrl" target="_blank" rel="noopener noreferrer" class="pdc-link">{{ doc.name }}</a>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import LoadingSpinner from '../LoadingSpinner.vue'
import type { ProjectAttachmentResponse } from '../../../../types/api-responses'

defineProps<{
  attachments: ProjectAttachmentResponse[]
  loading?: boolean
}>()
</script>

<style scoped>
.pdc-card {
  background: var(--color-white);
  padding: 1.25rem 1.5rem;
  height: 100%;
}

.pdc-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 1rem;
  color: var(--color-dtv-dark);
}

.pdc-empty {
  color: var(--color-text-muted);
  font-size: 0.9rem;
  margin: 0;
}

.pdc-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pdc-link {
  color: var(--color-dtv-green);
  text-decoration: underline;
  font-size: 0.9rem;
  word-break: break-word;
}
</style>
