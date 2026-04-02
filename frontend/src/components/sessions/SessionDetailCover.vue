<template>
  <div class="cover-photo">
    <img :src="url" :alt="alt" class="w-full block object-cover" :style="{ minHeight: `${minAspect * 100}cqi`, maxHeight: `${maxAspect * 100}cqi` }" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  groupKey: string
  date: string
  alt?: string
  minAspect?: number  // height/width floor  — default 0.75 (landscape 4:3)
  maxAspect?: number  // height/width cap    — default 1.33 (portrait 3:4)
}>()

const minAspect = computed(() => props.minAspect ?? 0.75)
const maxAspect = computed(() => props.maxAspect ?? 4 / 3)

const url = computed(() => `/media/${props.groupKey}/${props.date}/cover.jpg`)
</script>

<style scoped>
.cover-photo {
  container-type: inline-size;
  overflow: hidden;
}
</style>
