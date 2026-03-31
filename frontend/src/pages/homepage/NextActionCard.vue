<template>
  <!-- Next session: user has a registered upcoming session -->
  <template v-if="nextSession">
    <div class="flex flex-col items-center md:items-end pt-[10px]">
      <div class="bg-dtv-dark px-8 py-5">
        <p class="text-xs uppercase tracking-widest text-dtv-green/60 mb-2">Your next booking</p>
        <p class="font-body text-dtv-green text-2xl uppercase leading-none tracking-wide">{{ nextSession.groupName }}</p>
        <p class="text-dtv-green/80 text-sm mt-2">{{ formatDate(nextSession.date) }}</p>
      </div>
      <RouterLink
        :to="sessionPath(nextSession.groupKey!, nextSession.date)"
        class="bg-dtv-green px-8 py-3 font-body text-dtv-dark text-sm uppercase tracking-wide no-underline hover:bg-dtv-green/80 transition-colors self-stretch md:self-auto text-center"
      >
        Find out more →
      </RouterLink>
    </div>
  </template>

  <!-- Last session: user attended before but has no upcoming booking -->
  <template v-else-if="lastSession">
    <div class="flex flex-col items-center md:items-end pt-[10px]">
      <div class="bg-dtv-green px-8 py-5">
        <p class="text-xs uppercase tracking-widest text-dtv-dark/60 mb-2">Last time out</p>
        <p class="font-body text-dtv-dark text-2xl uppercase leading-none tracking-wide">{{ lastSession.groupName }}</p>
        <p class="text-dtv-dark/80 text-sm mt-2">{{ formatDate(lastSession.date) }}</p>
      </div>
      <button
        v-if="nextGlobalSession"
        class="bg-dtv-dark px-8 py-3 font-body text-dtv-green text-sm uppercase tracking-wide hover:bg-dtv-dark/80 transition-colors border-none cursor-pointer self-stretch md:self-auto"
        @click="emit('select', nextGlobalSession!.date)"
      >
        Book your next dig →
      </button>
      <div v-else class="bg-dtv-dark px-8 py-3 self-stretch md:self-auto text-center">
        <span class="font-body text-dtv-green text-sm uppercase tracking-wide">Book your next dig</span>
      </div>
    </div>
  </template>

  <!-- Default: public user or no personal session data -->
  <template v-else>
    <div class="flex flex-col items-center md:items-end pt-[10px]">
      <div class="bg-dtv-green px-8 py-5">
        <span class="font-body text-dtv-dark text-3xl uppercase leading-none tracking-wide">Pick a date</span>
      </div>
      <div class="bg-dtv-dark px-8 py-5 relative z-10">
        <span class="font-body text-dtv-green text-xl uppercase leading-none tracking-wide">Choose a session</span>
      </div>
      <div class="bg-dtv-dark px-8 py-5 relative z-10 my-8 mr-16">
        <span class="font-body text-dtv-green text-base uppercase leading-none tracking-wide">Book your spot</span>
      </div>
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
