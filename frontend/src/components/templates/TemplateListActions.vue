<template>
  <div class="list-actions">
    <span class="list-actions-stats">{{ templates.length }} templates</span>
    <div class="list-actions-buttons">
      <AppButton label="Share" icon="share" mode="icon-only" @click="onShare" />
      <AppButton v-if="canEdit" label="New template" icon="add" mode="icon-only" @click="emit('add-template')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import AppButton from '../AppButton.vue'
import { shareCurrentUrl } from '../../utils/shareUrl'
import type { TemplateResponse } from '../../../../types/api-responses'

defineProps<{
  templates: TemplateResponse[]
  /** Add templates (permission editTemplates) */
  canEdit: boolean
}>()

const emit = defineEmits<{ 'add-template': [] }>()

function onShare() {
  shareCurrentUrl()
}
</script>
