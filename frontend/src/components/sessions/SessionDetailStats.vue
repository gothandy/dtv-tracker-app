<template>
  <div class="bg-dtv-green px-6 py-4">
    <h2 class="font-display text-white text-xl uppercase leading-none mb-4">The Session In Stats</h2>
    <dl class="text-sm text-white space-y-1">
      <div class="flex gap-3">
        <dt class="text-white/60 w-28 shrink-0">Attended</dt>
        <dd>{{ session.registrations }}</dd>
      </div>
      <div class="flex gap-3">
        <dt class="text-white/60 w-28 shrink-0">Hours</dt>
        <dd>{{ session.hours }}</dd>
      </div>
      <div v-if="session.newCount" class="flex gap-3">
        <dt class="text-white/60 w-28 shrink-0">First timers</dt>
        <dd>{{ session.newCount }}</dd>
      </div>
      <div v-if="session.childCount" class="flex gap-3">
        <dt class="text-white/60 w-28 shrink-0">Children</dt>
        <dd>{{ session.childCount }}</dd>
      </div>
      <div v-if="session.regularCount" class="flex gap-3">
        <dt class="text-white/60 w-28 shrink-0">Regulars</dt>
        <dd>{{ session.regularCount }}</dd>
      </div>
    </dl>
  </div>
</template>

<script setup lang="ts">
import type { SessionDetailResponse } from '../../../../types/api-responses'
defineProps<{ session: SessionDetailResponse }>()
</script>
