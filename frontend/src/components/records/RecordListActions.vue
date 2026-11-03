<template>
  <div class="list-actions">
    <span class="list-actions-stats">
      {{ selectedRecords.length }} / {{ records.length }} records
    </span>
    <div class="list-actions-buttons">
      <AppButton label="Share" icon="share" mode="icon-only" @click="shareCurrentUrl" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppButton from '../AppButton.vue'
import type { RecordListItemResponse } from '../../../../types/api-responses'
import { shareCurrentUrl } from '../../utils/shareUrl'

const props = defineProps<{
  records: RecordListItemResponse[]
  selected: number[]
}>()

const selectedRecords = computed(() => props.records.filter(r => props.selected.includes(r.id)))
</script>
