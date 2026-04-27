<template>
  <div class="etp">
    <div v-if="summary?.length" class="etp-summary">
      <div
        v-for="icon in summary"
        :key="icon.alt"
        class="etp-summary-item"
        :class="{ 'etp-summary-item--subdued': icon.subdued }"
      >
        <span class="etp-summary-icon" :class="icon.color ? 'icon-' + icon.color : ''">
          <img :src="'/icons/' + icon.icon" :alt="icon.alt" />
        </span>
        <span>{{ icon.alt }}</span>
      </div>
    </div>

    <div class="etp-buttons">
      <AppButton
        :label="isChild ? 'Unset Child' : 'Set Child'"
        icon="badges/child"
        mode="icon-only"
        :variant="isChild ? 'primary' : 'subtle'"
        :selected="isChild"
        :disabled="disabled"
        @click="!disabled && emit('toggleChild')"
      />
      <AppButton
        :label="isEventbrite ? 'Unset Eventbrite' : 'Set Eventbrite'"
        icon="brands/eventbrite"
        mode="icon-only"
        :variant="isEventbrite ? 'primary' : 'subtle'"
        :selected="isEventbrite"
        :disabled="disabled"
        @click="!disabled && emit('toggleEventbrite')"
      />
      <AppButton
        v-for="t in pickerButtons"
        :key="t.labelKey!"
        :label="buttonLabel(t)"
        :icon="t.icon.replace('.svg', '')"
        mode="icon-only"
        :variant="isActive(t.labelKey!) ? 'primary' : 'subtle'"
        :selected="isActive(t.labelKey!)"
        :disabled="disabled"
        @click="!disabled && toggleLabel(t.labelKey!)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { EDITABLE_LABEL_ICONS, type LabelIcon } from '../utils/labelIcons'
import AppButton from './AppButton.vue'

const props = defineProps<{
  modelValue: string[]
  summary?: LabelIcon[]
  isChild?: boolean
  isEventbrite?: boolean
  disabled?: boolean
  showRegular?: boolean
}>()
const emit = defineEmits<{
  'update:modelValue': [value: string[]]
  'toggleChild': []
  'toggleEventbrite': []
}>()

const pickerButtons = computed(() =>
  props.showRegular ? EDITABLE_LABEL_ICONS : EDITABLE_LABEL_ICONS.filter(t => t.labelKey !== 'Regular')
)

function buttonLabel(t: typeof EDITABLE_LABEL_ICONS[number]): string {
  const active = isActive(t.labelKey!)
  const suffix = active ? t.activeLabel : undefined
  return (active ? 'Unset ' : 'Set ') + (suffix ? `${t.alt} (${suffix})` : t.alt)
}

function isActive(labelKey: string): boolean {
  return props.modelValue.includes(labelKey)
}

function toggleLabel(labelKey: string) {
  const current = props.modelValue
  const next = current.includes(labelKey)
    ? current.filter(l => l !== labelKey)
    : [...current, labelKey]
  emit('update:modelValue', next)
}
</script>

<style scoped>
.etp { display: flex; flex-direction: column; gap: 0.75rem; }

.etp-summary {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.etp-summary-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.etp-summary-icon {
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.etp-summary-icon img { width: 100%; height: 100%; object-fit: contain; }

.etp-summary-item--subdued { color: var(--color-dtv-sand-dark); }
.etp-summary-item--subdued .etp-summary-icon img { opacity: 0.4; }

.etp-buttons { display: flex; flex-wrap: wrap; gap: 0.4rem; }
</style>
