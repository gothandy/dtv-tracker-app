<template>
  <div class="concertina">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ref, provide } from 'vue'

const props = defineProps<{
  initialSelected?: number
}>()

const selectedIndex = ref<number | null>(props.initialSelected ?? null)
let nextIndex = 0

function registerItem(): number {
  return nextIndex++
}

function toggle(index: number) {
  selectedIndex.value = selectedIndex.value === index ? null : index
}

provide('concertina', { selectedIndex, registerItem, toggle })
</script>

<style scoped>
.concertina {
  display: flex;
  flex-direction: column;
  height: 100%;
}
</style>
