<template>
  <DefaultLayout>
    <div class="sandbox">

      <SandboxBackLink />
      <h1>Filter Components</h1>

      <h2>SessionListFilter</h2>
      <SessionListFilter :sessions="sessions" @filtered="filteredSessions = $event" />

      <h2>SessionListActions — empty</h2>
      <SessionListActions :sessions="sessions" :can-bulk-tag="true" v-model:selected="emptySelected" />

      <h2>SessionListActions — active (3 selected)</h2>
      <SessionListActions :sessions="sessions" :can-bulk-tag="true" v-model:selected="activeSelected" />

      <h2>GroupListFilter (Admin: New Group button visible)</h2>
      <GroupListFilter :groups="groups" :sessions="sessions" :can-add-group="true" @filtered="filteredGroups = $event" />

      <h2>EntryListFilter — notes search + quality filter (sandbox uses static entries; no API fetch)</h2>
      <EntryListFilter
        :entries="sampleEntries"
        @filter-change="entryFilterParams = $event"
        @filtered="entryFilterCount = $event.length"
      />
      <p v-if="entryFilterParams" class="filter-note">
        q: "{{ entryFilterParams.q }}" · accompanyingAdult: "{{ entryFilterParams.accompanyingAdult || '(all)' }}"
        · entryQuality: "{{ entryFilterParams.entryQuality || '(all)' }}" · showing {{ entryFilterCount }} entries
      </p>

    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import '../../styles/sandbox.css'
import { ref } from 'vue'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import SandboxBackLink from './SandboxBackLink.vue'
import SessionListFilter from '../../components/sessions/SessionListFilter.vue'
import SessionListActions from '../../components/sessions/SessionListActions.vue'
import GroupListFilter from '../../components/groups/GroupListFilter.vue'
import EntryListFilter from '../../components/entries/EntryListFilter.vue'
import { usePageTitle } from '../../composables/usePageTitle'
import type { Session } from '../../types/session'
import type { GroupResponse } from '../../../../types/api-responses'
import type { GroupWithStats } from '../../components/groups/GroupListFilter.vue'
import type { EntryFilterParams } from '../../components/entries/EntryListFilter.vue'
import type { EntryListItemResponse } from '../../../../types/api-responses'

usePageTitle('Sandbox')

const filteredSessions = ref<Session[]>([])
const filteredGroups = ref<GroupWithStats[]>([])
const entryFilterParams = ref<EntryFilterParams | null>(null)
const entryFilterCount = ref(0)
const emptySelected = ref<number[]>([])
const activeSelected = ref<number[]>([1, 3, 4])

const sessions: Session[] = [
  {
    id: 1, date: '2026-04-08', groupId: 1, groupKey: 'wed-dig', groupName: 'Wednesday Dig',
    groupDescription: 'Our popular mid-week dig.', financialYear: '2026-27',
    isBookable: false, limits: {}, stats: { count: 15, hours: 45, new: 1, regular: 13, eventbrite: 2 },
    metadata: [{ label: 'DH:Sheepskull', termGuid: 'aaa' }],
    projectId: 1, projectKey: 'spooky-wood', projectTitle: 'Spooky Wood',
    isRegistered: false, isAttended: false, isRegular: false,
  },
  {
    id: 2, date: '2026-04-15', groupId: 1, groupKey: 'wed-dig', groupName: 'Wednesday Dig',
    groupDescription: 'Our popular mid-week dig.', financialYear: '2026-27',
    isBookable: true, limits: {}, stats: { count: 8, hours: 0 },
    isRegistered: false, isAttended: false, isRegular: false,
  },
  {
    id: 3, date: '2026-03-20', groupId: 2, groupKey: 'trail-crew', groupName: 'Trail Crew',
    groupDescription: 'General trail maintenance across the forest.', financialYear: '2025-26',
    isBookable: false, limits: {}, stats: { count: 20, hours: 80, regular: 18, child: 2 },
    metadata: [{ label: 'DH', termGuid: 'bbb' }],
    isRegistered: false, isAttended: false, isRegular: false,
  },
  {
    id: 4, date: '2026-03-06', groupId: 3, groupKey: 'family-ride', groupName: 'Family Ride',
    groupDescription: 'Easy-going rides for families with children.', financialYear: '2025-26',
    isBookable: false, limits: {}, stats: { count: 12, hours: 24, new: 4, child: 8 },
    metadata: [{ label: 'Family', termGuid: 'ccc' }],
    isRegistered: false, isAttended: false, isRegular: false,
  },
  {
    id: 5, date: '2026-04-22', groupId: 2, groupKey: 'trail-crew', groupName: 'Trail Crew',
    groupDescription: 'General trail maintenance across the forest.', financialYear: '2026-27',
    isBookable: true, limits: {}, stats: { count: 5, hours: 0 },
    isRegistered: false, isAttended: false, isRegular: false,
  },
]

const groups: GroupResponse[] = [
  { id: 1, key: 'wed-dig', displayName: 'Wednesday Dig', description: 'Our popular mid-week dig.', regularsCount: 13, regulars: [] },
  { id: 2, key: 'trail-crew', displayName: 'Trail Crew', description: 'General trail maintenance across the forest.', regularsCount: 18, regulars: [] },
  { id: 3, key: 'family-ride', displayName: 'Family Ride', description: 'Easy-going rides for families with children.', regularsCount: 4, regulars: [] },
]

const sampleEntries: EntryListItemResponse[] = [
  {
    id: 1,
    volunteerName: 'Alice Bowen',
    date: '2026-04-01',
    groupKey: 'wed-dig',
    groupName: 'Wednesday Dig',
    notes: '#child',
    checkedIn: false,
    hours: 0,
    count: 1,
    isGroup: false,
    hasAccompanyingAdult: false,
  },
  {
    id: 2,
    volunteerName: 'Bob Carter',
    date: '2026-04-08',
    groupKey: 'wed-dig',
    groupName: 'Wednesday Dig',
    checkedIn: true,
    hours: 0,
    count: 1,
    isGroup: false,
    hasAccompanyingAdult: false,
  },
  {
    id: 3,
    volunteerName: 'Carol Davies',
    date: '2026-06-01',
    groupKey: 'trail-crew',
    groupName: 'Trail Crew',
    checkedIn: false,
    hours: 0,
    count: 1,
    isGroup: false,
    hasAccompanyingAdult: false,
  },
]
</script>

