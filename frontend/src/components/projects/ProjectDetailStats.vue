<template>
  <div class="bg-dtv-gold px-6 py-4">
    <h2 class="font-hero text-white text-xl uppercase leading-none mb-4">Totals</h2>
    <dl class="text-sm text-white space-y-1">
      <div class="flex gap-3">
        <dt class="text-white/60 w-28 shrink-0">Sessions</dt>
        <dd>{{ stats.sessions }}</dd>
      </div>
      <div class="flex gap-3">
        <dt class="text-white/60 w-28 shrink-0">Hours</dt>
        <dd>{{ stats.hours }}</dd>
      </div>
    </dl>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  stats: { sessions: number; hours: number }
}>()
</script>
