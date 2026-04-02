<template>
  <!-- Next session: user has a registered upcoming session -->
  <template v-if="nextSession">
    <div class="cta cta-right">
      <div class="cta-title cta-green w-fit">
        <h2 class="text-2xl">Your next booking</h2>
      </div>
      <div class="cta-body cta-dark w-fit text-xl">
        <span>{{ nextSession.groupName }}</span><br/>
        <span>{{ formatDate(nextSession.date) }}</span>
      </div>
      <div class="cta-button cta-green w-fit m-4">
        <RouterLink :to="sessionPath(nextSession.groupKey!, nextSession.date)" class="cta-btn cta-green cta-full">
          Find out more 🞂
        </RouterLink>
      </div>
    </div>
  </template>

  <!-- Last session: user attended before but has no upcoming booking -->
  <template v-else-if="lastSession">
    <div class="cta pt-[10px]">
      <div class="cta-block cta-green">
        <span class="cta-label">Last time out</span>
        <span class="cta-title">{{ lastSession.groupName }}</span>
        <span class="cta-meta">{{ formatDate(lastSession.date) }}</span>
      </div>
      <button v-if="nextGlobalSession" class="cta-btn cta-dark cta-full" @click="emit('select', nextGlobalSession!.date)">
        Book your next dig →
      </button>
      <div v-else class="cta-block cta-dark cta-sm">
        <span class="cta-title cta-sm">Book your next dig</span>
      </div>
    </div>
  </template>

  <!-- Default: public user or no personal session data -->
  <template v-else>
    <div class="cta cta-right">
      <div class="cta-title cta-green w-fit text-4xl p-6"><h2>Pick a date</h2></div>
      <div class="cta-body cta-dark w-1/2 text-2xl p-4 -mt-2">Choose a session</div>
      <div class="cta-body cta-white w-2/3 text-base m-4 p-4">Use the calendar to book your spot</div>
    </div>
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { Session } from '../../types/session'
import { sessionPath } from '../../router'

const props = defineProps<{
  sessions: Session[]
}>()

const emit = defineEmits<{
  select: [date: string]
}>()

const today = new Date().toISOString().substring(0, 10)

// The user's nearest upcoming registered session
const nextSession = computed(() =>
  props.sessions
    .filter(s => s.isRegistered && s.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null
)

// The user's most recent attended session (only shown when no upcoming booking)
const lastSession = computed(() =>
  props.sessions
    .filter(s => s.isAttended && s.date < today)
    .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
)

// First upcoming session globally — used by "Book your next dig" button
const nextGlobalSession = computed(() =>
  props.sessions
    .filter(s => s.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null
)

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}
</script>
