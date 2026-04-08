<template>
  <DefaultLayout>
    <div class="sandbox">

      <RouterLink to="/sandbox" class="back">← Sandbox</RouterLink>
      <h1>EntryList</h1>

      <h2>Grid reference</h2>
      <div class="demo">
        <div class="grid-ref">
          <div class="grid-ref-cell">1</div>
          <div class="grid-ref-cell">2</div>
          <div class="grid-ref-cell">3</div>
        </div>
      </div>

      <h2>Session — operational</h2>
      <div class="demo">
        <EntryList>
          <EntryCard
            v-for="e in sessionEntries" :key="e.id"
            :title="e.profile.name"
            :title-to="e.profile.slug ? profilePath(e.profile.slug) : undefined"
            :checked-in="e.checkedIn"
            :hours="e.hours"
            :icons="iconsForEntry({ ...e.profile, notes: e.notes })"
            :allow-edit="true"
            :working="workingId === e.id"
            @update="(c, h) => onUpdate(e, c, h)"
            @edit-entry="log(`editEntry: id=${e.id} &quot;${e.profile.name}&quot;`)"
          />
        </EntryList>
      </div>

      <h2>Session — read-only</h2>
      <div class="demo">
        <EntryList>
          <EntryCard
            v-for="e in sessionEntries" :key="e.id"
            :title="e.profile.name"
            :title-to="e.profile.slug ? profilePath(e.profile.slug) : undefined"
            :checked-in="e.checkedIn"
            :hours="e.hours"
            :icons="iconsForEntry({ ...e.profile, notes: e.notes })"
          />
        </EntryList>
      </div>

      <h2>Session — allow cancel</h2>
      <div class="demo">
        <EntryList>
          <EntryCard
            v-for="e in sessionEntries" :key="e.id"
            :title="e.profile.name"
            :title-to="e.profile.slug ? profilePath(e.profile.slug) : undefined"
            :checked-in="e.checkedIn"
            :hours="e.hours"
            :icons="iconsForEntry({ ...e.profile, notes: e.notes })"
            :allow-cancel="true"
            @cancel="log(`cancel: id=${e.id} &quot;${e.profile.name}&quot;`)"
          />
        </EntryList>
      </div>

      <h2>Profile</h2>
      <div class="demo">
        <EntryList>
          <EntryCard
            v-for="e in profileEntries" :key="e.id"
            :title="`${e.session.date} ${e.session.groupName}`"
            :title-to="sessionPath(e.session.groupKey, e.session.date)"
            :checked-in="e.checkedIn"
            :hours="e.hours"
            :icons="iconsForEntry({ notes: e.notes })"
          />
        </EntryList>
      </div>

      <h2>Empty</h2>
      <div class="demo">
        <EntryList>
          <span class="empty">No entries yet.</span>
        </EntryList>
      </div>

      <h2>Event log</h2>
      <div class="event-log">
        <div v-if="!events.length" class="event-log-empty">No events yet.</div>
        <div v-for="(e, i) in events" :key="i">{{ e }}</div>
      </div>

    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import EntryList from '../../components/EntryList.vue'
import EntryCard from '../../components/EntryCard.vue'
import { usePageTitle } from '../../composables/usePageTitle'
import { profilePath, sessionPath } from '../../router/index'
import { iconsForEntry } from '../../utils/tagIcons'
import type { EntryItem } from '../../types/entry'

usePageTitle('Sandbox')

const dhsc  = { groupKey: 'dhsc',  groupName: 'Dean Heritage Sheepskull Crew',                    date: '2026-04-19' }
const fod   = { groupKey: 'fod',   groupName: 'Forest of Dean',                                   date: '2026-03-15' }
const adhoc = { groupKey: 'adhoc', groupName: 'Ad Hoc',                                           date: '2026-05-01' }
const long  = { groupKey: 'x',     groupName: 'Very Long Group Name That Might Overflow The Card', date: '2026-02-08' }

const sessionEntries = ref<EntryItem[]>([
  { id: 1, checkedIn: false, hours: 0, count: 1, notes: undefined,
    profile: { name: 'Jo', slug: 'jo-1', isMember: false, cardStatus: undefined, isGroup: false }, session: dhsc },
  { id: 2, checkedIn: true,  hours: 0, count: 1, notes: undefined,
    profile: { name: 'Bartholomew Featherstonehaugh-Wright', slug: 'bartholomew-2', isMember: true, cardStatus: 'Accepted', isGroup: false }, session: dhsc },
  { id: 3, checkedIn: true,  hours: 3.5, count: 1, notes: '#New',
    profile: { name: 'Carol Davies', slug: 'carol-davies-18', isMember: false, cardStatus: 'Invited', isGroup: false }, session: dhsc },
  { id: 4, checkedIn: true,  hours: 6, count: 1, notes: '#Regular #DigLead #FirstAider #DofE #Child',
    profile: { name: 'Emma Fox', slug: 'emma-fox-99', isMember: true, cardStatus: 'Accepted', isGroup: false }, session: dhsc },
  { id: 5, checkedIn: false, hours: 0, count: 1, notes: '#Duplicate',
    profile: { name: 'Dean Heritage Volunteers Ltd', slug: undefined, isMember: false, cardStatus: undefined, isGroup: true }, session: dhsc },
  { id: 6, checkedIn: true,  hours: 1.5, count: 1, notes: undefined,
    profile: { name: 'Sam Green', slug: undefined, isMember: false, cardStatus: undefined, isGroup: false }, session: dhsc },
  { id: 7, checkedIn: false, hours: 0, count: 1, notes: '#New #Child',
    profile: { name: 'Priya Nair', slug: 'priya-nair-55', isMember: true, cardStatus: undefined, isGroup: false }, session: dhsc },
])

const profileEntries = ref<EntryItem[]>([
  { id: 10, checkedIn: true,  hours: 4,   count: 1, notes: '#Regular',
    profile: { name: 'Alice Bowen', slug: 'alice-bowen-42', isMember: false, cardStatus: undefined, isGroup: false }, session: dhsc },
  { id: 11, checkedIn: true,  hours: 3,   count: 1, notes: '#New',
    profile: { name: 'Alice Bowen', slug: 'alice-bowen-42', isMember: false, cardStatus: undefined, isGroup: false }, session: fod },
  { id: 12, checkedIn: false, hours: 0,   count: 1, notes: undefined,
    profile: { name: 'Alice Bowen', slug: 'alice-bowen-42', isMember: false, cardStatus: undefined, isGroup: false }, session: adhoc },
  { id: 13, checkedIn: true,  hours: 2.5, count: 1, notes: '#DigLead #FirstAider',
    profile: { name: 'Alice Bowen', slug: 'alice-bowen-42', isMember: false, cardStatus: undefined, isGroup: false }, session: long },
])

const events = ref<string[]>([])
const workingId = ref<number | null>(null)

function log(msg: string) { events.value.unshift(msg) }

async function onUpdate(entry: EntryItem, checkedIn: boolean, hours: number) {
  workingId.value = entry.id
  log(`update: id=${entry.id} → saving…`)
  await new Promise(r => setTimeout(r, 2000))
  entry.checkedIn = checkedIn
  entry.hours = hours
  workingId.value = null
  log(`update: id=${entry.id} → checkedIn=${checkedIn}, hours=${hours}`)
}
</script>

<style scoped>
.sandbox {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.back { color: var(--color-dtv-green); text-decoration: none; font-size: 0.9rem; padding: 2rem 2rem 0; }
.back:hover { text-decoration: underline; }

h1 { font-size: 1.5rem; font-weight: 700; padding: 0 2rem; }
h2 { font-size: 1rem; font-weight: 600; color: var(--color-text-muted); padding: 0 2rem; }

.demo { border-top: 1px solid var(--color-border); border-bottom: 1px solid var(--color-border); background: var(--color-dtv-sand-light); }

.empty { font-size: 0.9rem; color: var(--color-text-faint); }

.event-log {
  margin: 0 2rem 2rem;
  border: 1px solid var(--color-border);
  padding: 0.75rem;
  font-family: monospace;
  font-size: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-height: 3rem;
}
.event-log-empty { color: var(--color-text-faint); }

.grid-ref {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.5rem;
}

@media (width >= 48em) {
  .grid-ref {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
  }
}
.grid-ref-cell {
  background: var(--color-dtv-sand-dark);
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  color: var(--color-white);
}
</style>
