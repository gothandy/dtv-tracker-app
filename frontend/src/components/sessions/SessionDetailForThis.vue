<template>
  <div class="bg-dtv-green/20 px-6 py-5 flex flex-col gap-4">
    <div class="flex flex-col gap-2">
      <p v-if="isRegular" class="text-dtv-dark text-sm leading-snug">
        You're on the list as a regular. Your booking is made for you.
      </p>
      <p v-if="isNew" class="text-dtv-dark text-sm leading-snug">
        Your first session with DTV.
      </p>
      <p v-else-if="sessionCount > 1" class="text-dtv-dark text-sm leading-snug">
        All signed up. This will be your {{ ordinal(sessionCount) }} session.
      </p>
      <p v-else class="text-dtv-dark text-sm leading-snug">
        All signed up.
      </p>
    </div>

    <div class="flex flex-col gap-1">
      <p class="text-dtv-dark/50 text-xs">Can't make it?</p>
      <button
        class="self-end bg-dtv-dark text-white font-head text-sm uppercase tracking-wide py-2 px-4 cursor-pointer hover:bg-dtv-dark/80 transition-colors"
        :disabled="cancelling"
        @click="cancelBooking"
      >
        {{ cancelling ? 'Cancelling…' : 'Cancel Booking' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { SessionDetailResponse } from '../../../../types/api-responses'
import { useViewer } from '../../composables/useViewer'

const props = defineProps<{ session: SessionDetailResponse }>()

const { user } = useViewer()
const cancelling = ref(false)

const isRegular = computed(() => props.session.isRegular ?? false)
const sessionCount = computed(() => user?.profileStats?.sessionIds?.length ?? 0)
const isNew = computed(() => sessionCount.value === 1)

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

async function cancelBooking() {
  if (!props.session.userEntryId) return
  cancelling.value = true
  try {
    await fetch(`/api/entries/${props.session.userEntryId}`, { method: 'DELETE' })
    window.location.reload()
  } catch (e) {
    console.error('[ForThisSessionCard] cancel failed', e)
    cancelling.value = false
  }
}
</script>
