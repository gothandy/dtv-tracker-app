<template>
  <div class="bg-dtv-dark px-6 py-4">
    <p class="text-white/60 text-sm italic mb-2">Like the sound of this?</p>
    <p class="text-white text-sm leading-relaxed mb-3">{{ groupDescription }}</p>
    <RouterLink :to="nextSession" class="text-dtv-green text-sm italic hover:underline">
      Book on the next {{ groupName }}
    </RouterLink>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  groupName: string
  groupDescription?: string
  nextSession: string
}>()
</script>
