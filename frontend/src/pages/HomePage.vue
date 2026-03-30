<template>
  <DefaultLayout :padded="false">
    <HeroGrid>
      <!-- Title block: two stacked colour boxes -->
      <template #title>
        <div class="flex flex-col items-center md:items-end pt-[10px]">
          <div class="bg-dtv-green px-8 py-5">
            <span class="font-body text-dtv-dark text-3xl uppercase leading-none tracking-wide">Pick a date</span>
          </div>
          <div class="bg-dtv-dark px-8 py-5 relative z-10">
            <span class="font-body text-dtv-green text-xl uppercase leading-none tracking-wide">Choose a session</span>
          </div>
          <div class="bg-dtv-dark px-8 py-5 relative z-10 mt-8 mr-16">
            <span class="font-body text-dtv-green text-base uppercase leading-none tracking-wide">Book your spot</span>
          </div>
        </div>
      </template>

      <!-- Calendar -->
      <template #main>
        <div :class="['bg-dtv-green/25 min-h-[340px] h-full flex items-start justify-center p-4', store.loading ? 'animate-pulse' : '']">
          <CalendarWidget
            v-if="!store.error"
            v-model="selectedDate"
            :sessions="store.sessions"
@select="onDateSelect"
          />
          <div v-else class="text-red-500 text-sm">{{ store.error }}</div>
        </div>
      </template>

      <!-- Session picker -->
      <template #aside>
        <div class="min-h-[340px]">
          <template v-if="selectedDate && selectedSessions.length">
            <div class="text-xs uppercase tracking-widest text-gray-400 px-4 pt-6 pb-2">
              What's on {{ formatDate(selectedDate) }}
            </div>
            <div
              v-for="session in selectedSessions"
              :key="session.id"
              class="mt-4 first:mt-0"
            >
              <!-- Main row -->
              <div class="bg-dtv-green px-4 py-3 flex items-center justify-between gap-2 cursor-pointer hover:bg-dtv-green/80 transition-colors">
                <p class="font-body text-white text-sm uppercase leading-tight">
                  {{ session.groupName }}
                </p>
                <button class="bg-white p-2 flex-shrink-0 cursor-pointer">
                  <img src="/svg/next.svg" alt="" class="w-4 h-4" />
                </button>
              </div>
              <!-- Spaces left — future sessions -->
              <div v-if="!session.isRegistered && !session.isAttended && session.date >= todayKey" class="flex justify-end pr-3">
                <span :class="['px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white', (session.spacesAvailable - session.registrations) <= 5 ? 'bg-dtv-red' : 'bg-dtv-dark']">
                  {{ session.spacesAvailable - session.registrations }} spaces left
                </span>
              </div>
              <!-- Attended count — past sessions -->
              <div v-if="session.date < todayKey" class="flex justify-end pr-3">
                <span class="bg-dtv-dark px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white">
                  {{ session.registrations }} attended
                </span>
              </div>
              <!-- Registered / attended status -->
              <div v-if="session.isRegistered || session.isAttended" class="border-l-4 border-dtv-green bg-dtv-green/10 px-4 py-1.5 text-xs text-dtv-green uppercase tracking-wide">
                {{ session.isAttended ? 'Attended' : 'Registered' }}
              </div>
            </div>
          </template>
          <template v-else-if="!store.loading">
            <p class="text-gray-300 text-sm px-4 pt-4">Select a date to see sessions.</p>
          </template>
        </div>
      </template>
    </HeroGrid>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import HeroGrid from '../components/HeroGrid.vue'
import CalendarWidget from '../components/CalendarWidget.vue'
import { useSessionsStore } from '../stores/sessions'
import type { Session } from '../types/session'

const store = useSessionsStore()
const todayKey = new Date().toISOString().substring(0, 10)
const selectedDate = ref<string | undefined>(undefined)
const selectedSessions = ref<Session[]>([])

function onDateSelect(sessions: Session[]) {
  selectedSessions.value = sessions
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long'
  })
}

store.fetch()
</script>
