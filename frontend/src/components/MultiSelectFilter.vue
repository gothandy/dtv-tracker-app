<template>
  <!--
    A filter where every option starts ticked and each can be crossed out, leaving it out of the
    results. Version 1 is a native <select>: pick an option to flip its tick (✓) and cross (✗);
    pick the All choice to put every tick back. The last tick can't be crossed out (it's greyed),
    so the filter never hides everything. Closed, it shows a summary ("Hide: Closed", "Show: No status").
    A later version may become checkboxes in a custom dropdown (useDropdownPanel).
  -->
  <select class="list-filter-select" :aria-label="ariaLabel" :disabled="disabled" value="" @change="onChange">
    <option value="" disabled hidden>{{ summary }}</option>
    <option :value="MULTI_SELECT_ALL">{{ allLabel }}</option>
    <option v-for="o in options" :key="o.value" :value="o.value" :disabled="o.value === last">
      {{ excluded.includes(o.value) ? '✗' : '✓' }} {{ o.label }}
    </option>
  </select>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { toggleExcluded, multiSelectSummary, lastTicked, MULTI_SELECT_ALL, type MultiSelectOption } from '../utils/multiSelect'

const props = withDefaults(defineProps<{
  options: MultiSelectOption[]
  /** The crossed-out values (v-model:excluded) */
  excluded: string[]
  /** The choice that puts every tick back, e.g. "All statuses" */
  allLabel: string
  ariaLabel?: string
  disabled?: boolean
}>(), {
  ariaLabel: undefined,
  disabled: false,
})

const emit = defineEmits<{ 'update:excluded': [values: string[]] }>()

const last = computed(() => lastTicked(props.options, props.excluded))
const summary = computed(() => multiSelectSummary(props.options, props.excluded, props.allLabel))

function onChange(e: Event) {
  const select = e.target as HTMLSelectElement
  emit('update:excluded', toggleExcluded(props.excluded, select.value))
  select.value = ''   // back to the summary, ready for the next pick
}
</script>
