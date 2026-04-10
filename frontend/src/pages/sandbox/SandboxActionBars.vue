<template>
  <DefaultLayout>
    <div class="sandbox">

      <RouterLink to="/sandbox" class="back">← Sandbox</RouterLink>
      <h1>Action Bars</h1>

      <div class="sandbox-warning">Login to view some components</div>

      <h2>SessionDetailActions</h2>
      <SessionDetailActions :session="mockSession" group-key="sheepskull" date="2025-03-01" />

      <h2>SessionListActions (none selected)</h2>
      <SessionListActions :sessions="mockSessions" :can-bulk-tag="true" v-model:selected="noneSelected" />

      <h2>SessionListActions (some selected)</h2>
      <SessionListActions
        ref="listActionsRef"
        :sessions="mockSessions"
        :can-bulk-tag="true"
        v-model:selected="someSelected"
        @apply-tag="label => onListAction(listActionsRef, label)"
      />

      <h2>GroupDetailActions (with Eventbrite)</h2>
      <GroupDetailActions
        ref="actionsWithEbRef"
        :group="mockGroupWithEb"
        @edit-group="data => onGroupAction(actionsWithEbRef, 'edit-group', data)"
        @add-session="data => onGroupAction(actionsWithEbRef, 'add-session', data)"
        @delete-group="onGroupAction(actionsWithEbRef, 'delete-group')"
      />

      <h2>GroupDetailActions (without Eventbrite)</h2>
      <GroupDetailActions
        ref="actionsWithoutEbRef"
        :group="mockGroup"
        @edit-group="data => onGroupAction(actionsWithoutEbRef, 'edit-group', data)"
        @add-session="data => onGroupAction(actionsWithoutEbRef, 'add-session', data)"
        @delete-group="onGroupAction(actionsWithoutEbRef, 'delete-group')"
      />

      <label class="fail-toggle">
        <input type="checkbox" v-model="failNext" /> Fail next action
      </label>

      <h2>Event log</h2>
      <div class="event-log">
        <div v-if="!events.length" class="event-log-empty">No events yet.</div>
        <div v-for="(e, i) in events" :key="i">{{ e }}</div>
      </div>

    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import '../../styles/sandbox.css'
import { ref } from 'vue'
import { usePageTitle } from '../../composables/usePageTitle'
usePageTitle('Sandbox')
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import SessionDetailActions from '../../components/sessions/SessionDetailActions.vue'
import SessionListActions from '../../components/sessions/SessionListActions.vue'
import GroupDetailActions from '../../components/groups/GroupDetailActions.vue'
import type { GroupDetailResponse, SessionDetailResponse } from '../../../../types/api-responses'
import type { Session } from '../../types/session'

const actionsWithEbRef = ref<InstanceType<typeof GroupDetailActions> | null>(null)
const actionsWithoutEbRef = ref<InstanceType<typeof GroupDetailActions> | null>(null)
const listActionsRef = ref<InstanceType<typeof SessionListActions> | null>(null)

const failNext = ref(false)
const events = ref<string[]>([])

function log(msg: string) {
  events.value.unshift(msg)
}

type ActionsInstance = InstanceType<typeof GroupDetailActions> | null

async function onGroupAction(actions: ActionsInstance, label: string, data?: unknown) {
  const payload = data ? ` → ${JSON.stringify(data)}` : ''
  log(`${label}${payload} → saving…`)
  await new Promise(r => setTimeout(r, 2000))
  if (failNext.value) {
    failNext.value = false
    if (label === 'edit-group') actions?.onEditError('Server error — please try again')
    else if (label === 'add-session') actions?.onAddError('Server error — please try again')
    log(`${label} → failed`)
    return
  }
  if (label === 'edit-group') actions?.onEditSuccess()
  else if (label === 'add-session') actions?.onAddSuccess()
  else if (label === 'delete-group') actions?.onDeleteSuccess()
  log(`${label} → done`)
}

type ListActionsInstance = InstanceType<typeof SessionListActions> | null

async function onListAction(actions: ListActionsInstance, label: string) {
  log(`apply-tag: "${label}" → saving…`)
  await new Promise(r => setTimeout(r, 2000))
  if (failNext.value) {
    failNext.value = false
    actions?.onTagError('Server error — please try again')
    log(`apply-tag → failed`)
    return
  }
  actions?.onTagSuccess()
  log(`apply-tag → done`)
}

const mockSession: SessionDetailResponse = {
  id: 1,
  date: '2025-03-01',
  displayName: 'Sheepskull Morning Session',
  groupId: 1,
  groupName: 'Sheepskull',
  limits: {},
  registrations: 5,
  hours: 20,
  financialYear: '24/25',
  isBookable: false,
  coverMediaId: null,
  statsRaw: null,
  entries: [],
}

const mockSessions: Session[] = [
  { id: 1, date: '2025-01-10', groupName: 'Sheepskull', financialYear: '24/25', isBookable: false, limits: {}, registrations: 8,  hours: 32,   isRegistered: false, isAttended: false, isRegular: false },
  { id: 2, date: '2025-01-24', groupName: 'Sheepskull', financialYear: '24/25', isBookable: false, limits: {}, registrations: 6,  hours: 24,   isRegistered: false, isAttended: false, isRegular: false },
  { id: 3, date: '2025-02-07', groupName: 'City Park',  financialYear: '24/25', isBookable: true,  limits: {}, registrations: 12, hours: 0,    isRegistered: false, isAttended: false, isRegular: false },
  { id: 4, date: '2025-02-21', groupName: 'City Park',  financialYear: '24/25', isBookable: false, limits: {}, registrations: 10, hours: 40.5, isRegistered: false, isAttended: false, isRegular: false },
]

const noneSelected = ref<number[]>([])
const someSelected = ref<number[]>([1, 3])

const mockGroupWithEb: GroupDetailResponse = {
  id: 1,
  key: 'sheepskull',
  displayName: 'Sheepskull',
  description: 'Volunteer crew at Sheepskull nature reserve',
  eventbriteSeriesId: '123456789',
  regulars: [],
  financialYear: '24/25',
  stats: { sessions: 12, hours: 48, newVolunteers: 3, children: 0, totalVolunteers: 8 },
  sessions: [],
}

const mockGroup: GroupDetailResponse = {
  ...mockGroupWithEb,
  id: 2,
  key: 'citypark',
  displayName: 'City Park',
  eventbriteSeriesId: undefined,
}
</script>
