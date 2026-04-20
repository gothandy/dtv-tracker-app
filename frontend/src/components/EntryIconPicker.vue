<template>
  <div class="etp-tags">
    <AppButton
      v-for="t in tagButtons"
      :key="t.tag"
      :label="t.alt"
      :icon="t.icon.replace('.svg', '')"
      mode="icon-only"
      :variant="hasTag(t.tag!) ? 'primary' : 'subtle'"
      :selected="hasTag(t.tag!)"
      :disabled="disabled"
      @click="!disabled && toggleTag(t.tag!)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { EDITABLE_TAG_ICONS } from '../utils/tagIcons'
import AppButton from './AppButton.vue'

const props = defineProps<{ modelValue: string; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const tagButtons = EDITABLE_TAG_ICONS

function hasTag(tag: string): boolean {
  return new RegExp(tag, 'i').test(props.modelValue)
}

function toggleTag(tag: string) {
  let notes = props.modelValue
  if (hasTag(tag)) {
    notes = notes.replace(new RegExp('\\s*' + tag, 'gi'), '').trim()
  } else {
    notes = notes ? notes.trimEnd() + ' ' + tag : tag
  }
  emit('update:modelValue', notes)
}
</script>

<style scoped>
.etp-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; }
</style>
