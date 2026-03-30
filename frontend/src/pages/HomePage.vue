<template>
  <DefaultLayout>
    <h1 class="text-dtv-green text-4xl uppercase mb-6">My DTV Tracker</h1>

    <div v-if="store.loading" class="text-gray-400 text-sm">Loading sessions…</div>
    <div v-else-if="store.error" class="text-red-500 text-sm">{{ store.error }}</div>
    <template v-else>
      <CalendarWidget
        v-model="selectedDate"
        :sessions="store.sessions"
        @select="onDateSelect"
      />
      <p v-if="selectedSessions.length" class="mt-4 text-gray-600 text-sm">
        {{ selectedDate }}: {{ selectedSessions.length }} session(s)
      </p>
    </template>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import CalendarWidget from '../components/CalendarWidget.vue'
import { useSessionsStore } from '../stores/sessions'
import type { Session } from '../types/session'

const store = useSessionsStore()
const selectedDate = ref<string | undefined>(undefined)
const selectedSessions = ref<Session[]>([])

function onDateSelect(sessions: Session[]) {
  selectedSessions.value = sessions
}

onMounted(() => store.fetch())
</script>
