<template>
  <div class="etp-tags">
    <div v-for="t in tagButtons" :key="t.manualKey" class="etp-tag">
      <AppButton
        :label="t.alt"
        :icon="t.icon.replace('.svg', '')"
        mode="icon-only"
        :variant="isActive(t.manualKey!) ? 'primary' : 'subtle'"
        :selected="isActive(t.manualKey!)"
        :disabled="disabled"
        @click="!disabled && toggleTag(t.manualKey!)"
      />
      <span v-if="t.activeLabel && isActive(t.manualKey!)" class="etp-active-label">{{ t.activeLabel }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { EDITABLE_TAG_ICONS } from '../utils/tagIcons'
import AppButton from './AppButton.vue'
import type { EntryStatsManual } from '../../../types/entry-stats'

const props = defineProps<{ modelValue: EntryStatsManual; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: EntryStatsManual] }>()

const tagButtons = EDITABLE_TAG_ICONS

function isActive(key: keyof EntryStatsManual): boolean {
  return props.modelValue[key] === true
}

function toggleTag(key: keyof EntryStatsManual) {
  emit('update:modelValue', { ...props.modelValue, [key]: !props.modelValue[key] || undefined })
}
</script>

<style scoped>
.etp-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; }

.etp-tag {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
}

.etp-active-label {
  font-size: 0.65rem;
  color: var(--color-dtv-green-dark);
  font-weight: 600;
  line-height: 1;
}
</style>
