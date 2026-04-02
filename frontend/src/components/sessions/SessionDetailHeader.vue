<template>
  <div class="flex flex-col h-full">

    <!-- Table: black on white -->
    <div class="bg-white px-6 pt-8 pb-12">
      <dl class="text-sm text-dtv-dark space-y-1">
        <div class="flex gap-3">
          <dt class="text-gray-400 w-20 shrink-0">Date</dt>
          <dd>{{ formatDate(session.date) }}</dd>
        </div>
        <div class="flex gap-3">
          <dt class="text-gray-400 w-20 shrink-0">Time</dt>
          <dd>9:30 to 12:30 (3h)</dd><!-- TODO: add time field to API -->
        </div>
        <div class="flex gap-3">
          <dt class="text-gray-400 w-20 shrink-0">Location</dt>
          <dd>Forest of Dean Cycle Centre</dd><!-- TODO: add location field to API -->
        </div>
      </dl>
    </div>

    <!-- Description: white on green -->
    <div v-if="session.groupDescription" class="bg-dtv-dark px-6 py-8 mt-auto">
      <p class="text-white text-sm leading-relaxed">{{ session.groupDescription }}</p>
    </div>

  </div>
</template>

<script setup lang="ts">
import type { SessionDetailResponse } from '../../../../types/api-responses'

const props = defineProps<{ session: SessionDetailResponse }>()

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}
</script>
