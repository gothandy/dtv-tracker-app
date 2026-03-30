<template>
  <img :src="url" :alt="alt" class="w-full object-cover aspect-[3/4]" />
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  groupKey: string
  date: string
  alt?: string
}>()

const url = computed(() => `/media/${props.groupKey}/${props.date}/cover.jpg`)
</script>
