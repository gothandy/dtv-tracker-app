<template>
  <DefaultLayout>
    <LayoutColumns class="pt-8">
      <!-- CTA card: adapts to user's session history -->
      <template #left>
        <NextActionCard :sessions="store.sessions" @select="onCtaSelect" />
      </template>

      <!-- Calendar -->
      <template #middle>
        <div :class="['bg-dtv-green/25 min-h-[340px] h-full flex items-start justify-center p-2', store.loading ? 'animate-pulse' : '']">
          <CalendarWidget
            v-if="!store.error"
            v-model="selectedDate"
            :sessions="store.sessions"
            @select="onDateSelect"
            @confirm="onDateConfirm"
          />
          <div v-else class="text-red-500 text-sm">{{ store.error }}</div>
        </div>
      </template>

      <!-- Session picker -->
      <template #right>
        <SessionList
          ref="sessionListEl"
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
import NextActionCard from './homepage/NextActionCard.vue'
import { useSessionsStore } from '../stores/sessions'
import { useAuth } from '../composables/useAuth'
import { sessionPath } from '../router'
import type { Session } from '../types/session'

const route = useRoute()
const router = useRouter()
const store = useSessionsStore()
const { user } = useAuth()

const initialDate = typeof route.query.date === 'string' ? route.query.date : undefined
const selectedDate = ref<string | undefined>(initialDate)
const selectedSessions = ref<Session[]>([])
const sessionListEl = ref<{ $el: HTMLElement } | null>(null)
function onDateSelect(sessions: Session[]) {
  selectedSessions.value = sessions
}

function onDateConfirm(sessions: Session[]) {
  if (sessions.length === 1) {
    router.push(sessionPath(sessions[0].groupKey!, sessions[0].date))
  } else {
    sessionListEl.value?.$el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function onCtaSelect(date: string) {
  selectedDate.value = date
}

watch(selectedDate, (date) => {
  router.replace({ query: date ? { date } : {} })
})

store.fetch()
</script>
