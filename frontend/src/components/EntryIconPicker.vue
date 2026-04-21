<template>
  <div class="etp-tags">
    <AppButton
      v-for="t in tagButtons"
      :key="t.manualKey"
      :label="(isActive(t.manualKey!) ? 'Unset ' : 'Set ') + (t.activeLabel ? `${t.alt} (${t.activeLabel})` : t.alt)"
      :icon="t.icon.replace('.svg', '')"
      mode="icon-only"
      :variant="isActive(t.manualKey!) ? 'primary' : 'subtle'"
      :selected="isActive(t.manualKey!)"
      :disabled="disabled"
      @click="!disabled && toggleTag(t.manualKey!)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { EDITABLE_TAG_ICONS } from '../utils/tagIcons'
import AppButton from './AppButton.vue'
import type { EntryStatsManual, EntryStatsSnapshot } from '../../../types/entry-stats'

const props = defineProps<{ modelValue: EntryStatsManual; snapshot?: EntryStatsSnapshot; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: EntryStatsManual] }>()

const tagButtons = computed(() =>
  EDITABLE_TAG_ICONS.filter(t =>
    !t.snapshotKey || props.snapshot?.[t.snapshotKey]
  )
)

function isActive(key: keyof EntryStatsManual): boolean {
  return props.modelValue[key] === true
}

function toggleTag(key: keyof EntryStatsManual) {
  emit('update:modelValue', { ...props.modelValue, [key]: !props.modelValue[key] || undefined })
}
</script>

<style scoped>
.etp-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; }
</style>
