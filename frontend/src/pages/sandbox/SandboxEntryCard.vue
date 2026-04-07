<template>
  <DefaultLayout>
    <div class="sandbox">

      <RouterLink to="/sandbox" class="back">← Sandbox</RouterLink>
      <h1>EntryCard</h1>

      <!-- Full width -->
      <h2>Session — Operational (full width)</h2>
      <div class="demo">
        <EntryList display-type="session" :entries="sessionEntries" :allow-edit="true" :working-id="workingId"
          @update="onUpdate"
        />
      </div>

      <!-- 2-1 -->
      <h2>Session — Read-only (2-1)</h2>
      <LayoutColumns ratio="2-1">
        <template #left>
          <div class="demo">
            <EntryList display-type="session" :entries="sessionEntries" />
          </div>
        </template>
        <template #right>
          <div class="demo demo--placeholder">other content</div>
        </template>
      </LayoutColumns>

      <!-- 1-2 -->
      <h2>Session — allowCancel (1-2)</h2>
      <LayoutColumns ratio="1-2">
        <template #left>
          <div class="demo">
            <EntryList display-type="session" :entries="sessionEntries" :allow-cancel="true"
              @cancel="onCancel"
            />
          </div>
        </template>
        <template #right>
          <div class="demo demo--placeholder">other content</div>
        </template>
      </LayoutColumns>

      <h2>Profile (full width)</h2>
      <div class="demo">
        <EntryList display-type="profile" :entries="profileEntries" />
      </div>

      <h2>Event log</h2>
      <div class="event-log">
        <div v-if="!events.length" class="event-log-empty">No events yet.</div>
        <div v-for="(e, i) in events" :key="i" class="event-log-entry">{{ e }}</div>
      </div>

    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import LayoutColumns from '../../components/LayoutColumns.vue'
import EntryList from '../../components/EntryList.vue'
import { usePageTitle } from '../../composables/usePageTitle'
import type { EntryItem } from '../../types/entry'

usePageTitle('Sandbox')

const dhsc = { groupKey: 'dhsc', groupName: 'Dean Heritage Sheepskull Crew', date: '2026-04-19' }
const fod = { groupKey: 'fod', groupName: 'Forest of Dean Crew', date: '2026-03-15' }

const sessionEntries = ref<EntryItem[]>([
  {
    id: 1,
    checkedIn: false,
    hours: 0,
    count: 1,
    notes: undefined,
    profile: { name: 'Alice Bowen', slug: 'alice-bowen-42', isMember: false, cardStatus: undefined, isGroup: false },
    session: dhsc,
  },
  {
    id: 2,
    checkedIn: true,
    hours: 0,
    count: 1,
    notes: '#New',
    profile: { name: 'Bob Carter', slug: 'bob-carter-7', isMember: true, cardStatus: 'Accepted', isGroup: false },
    session: dhsc,
  },
  {
    id: 3,
    checkedIn: true,
    hours: 3.5,
    count: 1,
    notes: '#Regular #DigLead',
    profile: { name: 'Carol Davies', slug: 'carol-davies-18', isMember: true, cardStatus: 'Invited', isGroup: false },
    session: dhsc,
  },
  {
    id: 4,
    checkedIn: false,
    hours: 0,
    count: 1,
    notes: '#Duplicate',
    profile: { name: 'Dean Heritage Volunteers Ltd', slug: undefined, isMember: false, cardStatus: undefined, isGroup: true },
    session: dhsc,
  },
  {
    id: 5,
    checkedIn: true,
    hours: 2,
    count: 1,
    notes: '#FirstAider',
    profile: { name: 'Emma Fox', slug: 'emma-fox-99', isMember: false, cardStatus: undefined, isGroup: false },
    session: dhsc,
  },
])

const profileEntries = ref<EntryItem[]>([
  {
    id: 10,
    checkedIn: true,
    hours: 4,
    count: 1,
    notes: '#Regular',
    profile: { name: 'Alice Bowen', slug: 'alice-bowen-42', isMember: false, cardStatus: undefined, isGroup: false },
    session: dhsc,
  },
  {
    id: 11,
    checkedIn: true,
    hours: 3,
    count: 1,
    notes: '#New',
    profile: { name: 'Alice Bowen', slug: 'alice-bowen-42', isMember: false, cardStatus: undefined, isGroup: false },
    session: fod,
  },
  {
    id: 12,
    checkedIn: false,
    hours: 0,
    count: 1,
    notes: undefined,
    profile: { name: 'Alice Bowen', slug: 'alice-bowen-42', isMember: false, cardStatus: undefined, isGroup: false },
    session: { groupKey: 'dhsc', groupName: 'Dean Heritage Sheepskull Crew', date: '2026-05-10' },
  },
])

const events = ref<string[]>([])
const workingId = ref<number | null>(null)

async function onUpdate(entry: EntryItem, checkedIn: boolean, hours: number) {
  workingId.value = entry.id
  events.value.unshift(`update: id=${entry.id} "${entry.profile.name}" → saving…`)
  await new Promise(r => setTimeout(r, 2000))
  entry.checkedIn = checkedIn
  entry.hours = hours
  workingId.value = null
  events.value[0] = `update: id=${entry.id} "${entry.profile.name}" → checkedIn=${checkedIn}, hours=${hours}`
}

function onCancel(entry: EntryItem) {
  events.value.unshift(`cancel: id=${entry.id} "${entry.profile.name}"`)
}
</script>

<style scoped>
.sandbox {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.back { color: var(--color-dtv-green); text-decoration: none; font-size: 0.9rem; }
.back:hover { text-decoration: underline; }

h1 { font-size: 1.5rem; font-weight: 700; }
h2 { font-size: 1rem; font-weight: 600; color: var(--color-text-muted); margin-bottom: 0.25rem; }

.demo {
  border: 1px solid var(--color-border);
  padding: 0.5rem;
}

.event-log {
  border: 1px solid var(--color-border);
  padding: 0.75rem;
  font-family: monospace;
  font-size: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-height: 3rem;
}

.event-log-empty {
  color: var(--color-text-faint);
}

.event-log-entry {
  color: var(--color-text);
}

.demo--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-faint);
  font-size: 0.85rem;
  min-height: 4rem;
}
</style>
