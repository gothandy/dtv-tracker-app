<template>
  <!-- Responsive column layout: stacks to single column on mobile -->
  <!-- ratio="1-1-1": three equal columns (left | middle | right) -->
  <!-- ratio="2-1":   wide left, narrow right -->
  <!-- ratio="1-2":   narrow left, wide right -->
  <div :class="gridClass">
    <div v-if="slots.left" class="overflow-visible self-start">
      <slot name="left" />
    </div>
    <div v-if="slots.middle" class="self-stretch">
      <slot name="middle" />
    </div>
    <div v-if="slots.right" class="min-w-0">
      <slot name="right" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue'

const props = withDefaults(defineProps<{
  ratio?: '1-1-1' | '2-1' | '1-2'
}>(), {
  ratio: '1-1-1',
})

const slots = useSlots()

const gridClass = computed(() => {
  const base = 'grid grid-cols-1 items-stretch'
  if (props.ratio === '2-1') return `${base} md:grid-cols-[2fr_1fr]`
  if (props.ratio === '1-2') return `${base} md:grid-cols-[1fr_2fr]`
  return `${base} md:grid-cols-3` // 1-1-1
})
</script>
