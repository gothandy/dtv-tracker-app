<template>
  <span
    class="pdc-lozenge"
    :class="{ 'pdc-lozenge-deleting': deleting, 'pdc-lozenge--removable': removable }"
  >
    <a
      :href="url"
      target="_blank"
      rel="noopener noreferrer"
      class="pdc-name"
      :title="label"
    >{{ displayLabel }}</a>
    <button
      v-if="removable"
      type="button"
      class="pdc-remove"
      aria-label="Remove document"
      :disabled="deleting"
      @click="emit('remove')"
    >
      <img src="/icons/close.svg" width="10" height="10" alt="" class="svg-black" />
    </button>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  label: string
  url: string
  removable?: boolean
  deleting?: boolean
}>()

const emit = defineEmits<{ remove: [] }>()

const displayLabel = computed(() => props.label.replace(/\.pdf$/i, ''))
</script>
