<template>
  <div class="etp-tags">
    <AppButton
      v-for="t in tagButtons"
      :key="t.tag"
      :label="t.alt"
      :icon="t.icon.replace('.svg', '')"
      mode="icon-only"
      :selected="hasTag(t.tag!)"
      @click="toggleTag(t.tag!)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { TAG_ICONS } from '../utils/tagIcons'
import AppButton from './AppButton.vue'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const tagButtons = TAG_ICONS.filter(t => t.type === 'tag')

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
