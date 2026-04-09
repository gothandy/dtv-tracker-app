<template>
  <!-- Responsive column layout: stacks to single column on mobile -->
  <!-- ratio="1":     single full-width column (left slot only) -->
  <!-- ratio="1-1-1": three equal columns (left | middle | right) -->
  <!-- ratio="2-1":   wide left, narrow right -->
  <!-- ratio="1-2":   narrow left, wide right -->
  <!-- reverse:       desktop order preserved; mobile stacks right → middle → left -->
  <section>
    <slot name="header" />
    <div :class="gridClass">
      <template v-if="ratio === '1'">
        <div class="min-w-0 self-stretch"><slot name="left" /></div>
      </template>
      <template v-else-if="ratio === '1-1-1'">
        <div class="min-w-0 self-stretch"><slot name="left" /></div>
        <div class="min-w-0 self-stretch"><slot name="middle" /></div>
        <div class="min-w-0 self-stretch"><slot name="right" /></div>
      </template>
      <template v-else>
        <div class="min-w-0 self-stretch" :class="reverse ? 'order-2 md:order-none' : ''"><slot name="left" /></div>
        <div class="min-w-0 self-stretch" :class="reverse ? 'order-1 md:order-none' : ''"><slot name="right" /></div>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  ratio?: '1' | '1-1-1' | '2-1' | '1-2'
  align?: 'stretch' | 'start'
  reverse?: boolean
}>(), {
  ratio: '1-1-1',
  align: 'stretch',
  reverse: false,
})

const gridClass = computed(() => {
  const alignClass = props.align === 'start' ? 'items-start' : 'items-stretch'
  const base = `grid grid-cols-1 ${alignClass}`
  if (props.ratio === '1') return base
  if (props.ratio === '2-1') return `${base} md:grid-cols-[2fr_1fr]`
  if (props.ratio === '1-2') return `${base} md:grid-cols-[1fr_2fr]`
  return `${base} md:grid-cols-3` // 1-1-1
})
</script>
