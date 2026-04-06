<template>
  <div class="min-h-[340px]">
    <template v-if="groupedDates.length">
      <div v-for="group in groupedDates" :key="group.date">
        <div class="text-xs uppercase tracking-widest text-gray-400 px-4 pt-12 pb-2">
          What's on {{ formatDate(group.date) }}
        </div>
        <div
          v-for="session in group.sessions"
          :key="session.id"
          class="mt-4 first:mt-0"
        >
          <!-- Main row -->
          <RouterLink
            :to="sessionPath(session.groupKey!, session.date)"
            class="bg-dtv-green px-4 py-4 flex items-center justify-between gap-2 hover:bg-dtv-green/80 transition-colors no-underline"
          >
            <p class="font-body text-white text-sm uppercase leading-tight">
              {{ session.groupName }} 🞂
            </p>
            
          </RouterLink>

          <!-- Tags row — kissing below -->
          <div class="flex justify-end">
            <!-- User status -->
            <span v-if="session.isAttended"    class="session-tab bg-dtv-dark opacity-70">Attended</span>
            <span v-else-if="session.isRegistered" class="session-tab bg-dtv-dark opacity-70">Registered</span>
            <span v-else-if="session.isRegular"    class="session-tab bg-dtv-dark opacity-70">Regular</span>
            <!-- Spaces left (future) or attended count (past) -->
            <span v-if="session.date >= todayKey && session.limits.total !== undefined"
              :class="['session-tab bg-dtv-dark', (session.isRegistered || session.isAttended) ? 'opacity-70' : '']">
              {{ session.limits.total - session.registrations }} spaces left
            </span>
            <span v-else class="session-tab bg-dtv-dark">{{ session.registrations }} attended</span>
          </div>
        </div>
      </div>
    </template>
    <template v-else-if="!loading">
      <p class="text-gray-300 text-sm px-4 pt-4">Select a date to see sessions.</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Session } from '../../types/session'
import { sessionPath } from '../../router'

const props = defineProps<{
  sessions: Session[]
  selectedDate?: string
  loading?: boolean
}>()

const todayKey = new Date().toISOString().substring(0, 10)

// Group sessions by date. If selectedDate is provided, only show that date.
const groupedDates = computed(() => {
  const filtered = props.selectedDate
    ? props.sessions.filter(s => s.date?.substring(0, 10) === props.selectedDate)
    : props.sessions

  const map = new Map<string, Session[]>()
  for (const s of filtered) {
    const key = s.date?.substring(0, 10)
    if (!key) continue
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(s)
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, sessions]) => ({ date, sessions }))
})

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long'
  })
}
</script>

<style scoped>
.session-tab {
  padding: 0.375rem 0.75rem;
  margin-right: 0.375rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-white);
}
</style>
