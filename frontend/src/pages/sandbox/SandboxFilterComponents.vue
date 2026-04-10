<template>
  <DefaultLayout>
    <div class="sandbox">

      <RouterLink to="/sandbox" class="back">← Sandbox</RouterLink>
      <h1>Filter Components</h1>

      <h2>SessionListFilter</h2>
      <SessionListFilter :sessions="sessions" @filtered="filteredSessions = $event" />

      <h2>SessionListActions — empty</h2>
      <SessionListActions :sessions="sessions" :can-bulk-tag="true" v-model:selected="emptySelected" />

      <h2>SessionListActions — active (3 selected)</h2>
      <SessionListActions :sessions="sessions" :can-bulk-tag="true" v-model:selected="activeSelected" />

      <h2>GroupListFilter (Admin: New Group button visible)</h2>
      <GroupListFilter :groups="groups" :sessions="sessions" :can-add-group="true" @filtered="filteredGroups = $event" />

    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import '../../styles/sandbox.css'
import { ref } from 'vue'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import SessionListFilter from '../../components/sessions/SessionListFilter.vue'
import SessionListActions from '../../components/sessions/SessionListActions.vue'
import GroupListFilter from '../../components/groups/GroupListFilter.vue'
import { usePageTitle } from '../../composables/usePageTitle'
import type { Session } from '../../types/session'
import type { GroupResponse } from '../../../../types/api-responses'
import type { GroupWithStats } from '../../components/groups/GroupListFilter.vue'

usePageTitle('Sandbox')

const filteredSessions = ref<Session[]>([])
const filteredGroups = ref<GroupWithStats[]>([])
const emptySelected = ref<number[]>([])
const activeSelected = ref<number[]>([1, 3, 4])

const sessions: Session[] = [
  {
    id: 1, date: '2026-04-08', groupId: 1, groupKey: 'wed-dig', groupName: 'Wednesday Dig',
    groupDescription: 'Our popular mid-week dig.', financialYear: '2026-27',
    isBookable: false, limits: {}, registrations: 15, hours: 45,
    newCount: 1, regularCount: 13, eventbriteCount: 2,
    metadata: [{ label: 'DH:Sheepskull', termGuid: 'aaa' }],
    isRegistered: false, isAttended: false, isRegular: false,
  },
  {
    id: 2, date: '2026-04-15', groupId: 1, groupKey: 'wed-dig', groupName: 'Wednesday Dig',
    groupDescription: 'Our popular mid-week dig.', financialYear: '2026-27',
    isBookable: true, limits: {}, registrations: 8, hours: 0,
    isRegistered: false, isAttended: false, isRegular: false,
  },
  {
    id: 3, date: '2026-03-20', groupId: 2, groupKey: 'trail-crew', groupName: 'Trail Crew',
    groupDescription: 'General trail maintenance across the forest.', financialYear: '2025-26',
    isBookable: false, limits: {}, registrations: 20, hours: 80,
    regularCount: 18, childCount: 2,
    metadata: [{ label: 'DH', termGuid: 'bbb' }],
    isRegistered: false, isAttended: false, isRegular: false,
  },
  {
    id: 4, date: '2026-03-06', groupId: 3, groupKey: 'family-ride', groupName: 'Family Ride',
    groupDescription: 'Easy-going rides for families with children.', financialYear: '2025-26',
    isBookable: false, limits: {}, registrations: 12, hours: 24,
    newCount: 4, childCount: 8,
    metadata: [{ label: 'Family', termGuid: 'ccc' }],
    isRegistered: false, isAttended: false, isRegular: false,
  },
  {
    id: 5, date: '2026-04-22', groupId: 2, groupKey: 'trail-crew', groupName: 'Trail Crew',
    groupDescription: 'General trail maintenance across the forest.', financialYear: '2026-27',
    isBookable: true, limits: {}, registrations: 5, hours: 0,
    isRegistered: false, isAttended: false, isRegular: false,
  },
]

const groups: GroupResponse[] = [
  { id: 1, key: 'wed-dig', displayName: 'Wednesday Dig', description: 'Our popular mid-week dig.', regularsCount: 13, regulars: [] },
  { id: 2, key: 'trail-crew', displayName: 'Trail Crew', description: 'General trail maintenance across the forest.', regularsCount: 18, regulars: [] },
  { id: 3, key: 'family-ride', displayName: 'Family Ride', description: 'Easy-going rides for families with children.', regularsCount: 4, regulars: [] },
]
</script>

