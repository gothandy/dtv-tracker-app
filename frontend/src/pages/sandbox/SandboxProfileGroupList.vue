<template>
  <DefaultLayout>
    <div class="sandbox">

      <RouterLink to="/sandbox" class="back">← Sandbox</RouterLink>
      <h1>ProfileGroupList</h1>

      <h2>Admin/Check-In — regular checkbox</h2>
      <div class="demo">
        <ProfileGroupList
          :groups="mockGroups"
          :allow-toggle-regular="true"
          ref="adminRef"
          @add-regular="onAddRegular"
          @remove-regular="onRemoveRegular"
        />
      </div>

      <h2>Self-Service / Read-Only — Regular badge, no toggle</h2>
      <div class="demo">
        <ProfileGroupList
          :groups="mockGroups"
        />
      </div>

      <h2>Empty state</h2>
      <div class="demo">
        <ProfileGroupList
          :groups="[]"
        />
      </div>

      <h2>This FY hours</h2>
      <div class="demo">
        <ProfileGroupList
          :groups="mockGroups"
          fy="thisFY"
        />
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
import '../../styles/sandbox.css'
import { ref, reactive } from 'vue'
import { usePageTitle } from '../../composables/usePageTitle'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import ProfileGroupList from '../../components/profiles/ProfileGroupList.vue'
import type { ProfileGroupHours } from '../../../../types/api-responses'

usePageTitle('Sandbox')

const events = ref<string[]>([])
const adminRef = ref<InstanceType<typeof ProfileGroupList> | null>(null)

function log(msg: string) {
  events.value.unshift(msg)
}

const FAIL_GROUP_ID = 2

function onAddRegular(groupId: number) {
  log(`addRegular groupId=${groupId}`)
  setTimeout(() => {
    if (groupId === FAIL_GROUP_ID) {
      log(`addRegular groupId=${groupId} — FAILED`)
      adminRef.value?.onError(groupId, 'Failed to add regular — please try again')
      return
    }
    const g = mockGroups.find(g => g.groupId === groupId)
    if (g) { g.isRegular = true; g.regularId = 999 }
    adminRef.value?.onSuccess(groupId)
  }, 1000)
}

function onRemoveRegular(regularId: number, groupId: number) {
  log(`removeRegular regularId=${regularId} groupId=${groupId}`)
  setTimeout(() => {
    if (groupId === FAIL_GROUP_ID) {
      log(`removeRegular groupId=${groupId} — FAILED`)
      adminRef.value?.onError(groupId, 'Failed to remove regular — please try again')
      return
    }
    const g = mockGroups.find(g => g.groupId === groupId)
    if (g) { g.isRegular = false; g.regularId = undefined }
    adminRef.value?.onSuccess(groupId)
  }, 1000)
}

const mockGroups = reactive<ProfileGroupHours[]>([
  {
    groupId: 1,
    groupKey: 'sheepskull',
    groupName: 'Sheepskull',
    hoursThisFY: 12,
    hoursLastFY: 28,
    hoursAll: 40,
    isRegular: true,
    regularId: 101,
  },
  {
    groupId: 2,
    groupKey: 'dig-deep',
    groupName: 'Dig Deep',
    hoursThisFY: 6,
    hoursLastFY: 0,
    hoursAll: 6,
    isRegular: false,
  },
  {
    groupId: 3,
    groupKey: 'riverside',
    groupName: 'Riverside Crew',
    hoursThisFY: 0,
    hoursLastFY: 14,
    hoursAll: 14,
    isRegular: false,
  },
])
</script>
