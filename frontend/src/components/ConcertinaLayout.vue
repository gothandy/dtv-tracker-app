<template>
  <div class="concertina">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ref, provide } from 'vue'

const selectedIndex = ref<number | null>(0)
let nextIndex = 0

function registerItem(): number {
  return nextIndex++
}

function toggle(index: number) {
  if (selectedIndex.value === index) return
  selectedIndex.value = index
}

provide('concertina', { selectedIndex, registerItem, toggle })
</script>

<style scoped>
.concertina {
  display: flex;
  flex-direction: column;
}
</style>
