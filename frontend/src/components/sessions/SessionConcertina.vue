<template>
  <ConcertinaLayout :key="sessions.map(s => s.id).join('-')">
    <ConcertinaItem
      v-for="session in sessions"
      :key="session.id"
      :label="session.groupName ?? ''"
      :on-selected-click="() => router.push(sessionPath(session.groupKey!, session.date))"
    >
      <SessionCard :session="session" />
    </ConcertinaItem>
  </ConcertinaLayout>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import ConcertinaLayout from '../ConcertinaLayout.vue'
import ConcertinaItem from '../ConcertinaItem.vue'
import SessionCard from './SessionCard.vue'
import { sessionPath } from '../../router'
import type { Session } from '../../types/session'

defineProps<{
  sessions: Session[]
  loading?: boolean
}>()

const router = useRouter()
</script>
