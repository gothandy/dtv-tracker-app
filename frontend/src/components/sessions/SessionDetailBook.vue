<template>
  <div class="p-6 flex flex-col">

    <p v-if="daysToGo !== null" class="bg-dtv-green/50 text-center text-dtv-dark text-sm font-bold uppercase tracking-wide py-4 px-6 self-start w-fit ml-12">
      {{ daysToGo }} days to go
    </p>

    <button class="bg-dtv-green text-white font-head text-lg uppercase tracking-wide py-4 px-8 self-center cursor-pointer hover:bg-dtv-green/80 transition-colors">
      Book your spot
    </button>

    <div v-if="spacesLeft !== null" class="bg-dtv-dark text-white py-3 px-4 flex items-center justify-center self-end w-fit mr-12">
      <span class="font-head text-2xl leading-none">{{ spacesLeft }}</span>
      <span class="text-sm uppercase tracking-wide ml-2">Spaces Left</span>
    </div>

    <p class="text-gray-400 text-xs leading-snug text-center mt-4">
      First time? We'll show you what to do.
    </p>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SessionDetailResponse } from '../../../../types/api-responses'

const props = defineProps<{ session: SessionDetailResponse }>()

const spacesLeft = computed(() => props.session.limits.total !== undefined ? props.session.limits.total - props.session.registrations : null)

const daysToGo = computed(() => {
  const diff = Math.ceil((new Date(props.session.date).getTime() - Date.now()) / 86_400_000)
  return diff >= 0 && diff <= 15 ? diff : null
})
</script>
