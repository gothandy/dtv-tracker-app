<template>
  <DefaultLayout :padded="false">
    <LayoutColumns>
      <!-- Title block: two stacked colour boxes -->
      <template #left>
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

      <!-- Calendar -->
      <template #middle>
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
      <template #right>
        <SessionList
          :sessions="selectedSessions"
          :selected-date="selectedDate"
          :loading="store.loading"
        />
      </template>
    </LayoutColumns>
    <DebugData v-if="user" :item="user" />
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import LayoutColumns from '../components/LayoutColumns.vue'
import CalendarWidget from '../components/CalendarWidget.vue'
import SessionList from '../components/SessionList.vue'
import DebugData from '../components/DebugData.vue'
import { useSessionsStore } from '../stores/sessions'
import { useAuth } from '../composables/useAuth'
import type { Session } from '../types/session'

const route = useRoute()
const router = useRouter()
const store = useSessionsStore()
const { user } = useAuth()

const initialDate = typeof route.query.date === 'string' ? route.query.date : undefined
const selectedDate = ref<string | undefined>(initialDate)
const selectedSessions = ref<Session[]>([])

function onDateSelect(sessions: Session[]) {
  selectedSessions.value = sessions
}

watch(selectedDate, (date) => {
  router.replace({ query: date ? { date } : {} })
})

store.fetch()
</script>
