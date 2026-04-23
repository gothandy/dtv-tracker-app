<template>
  <DefaultLayout>
    <h1 class="sr-only">Groups</h1>
    <PageHeader>Groups</PageHeader>
    <div class="pb-6">
      <GroupListFilter
        :groups="groupsStore.groups"
        :sessions="sessionsStore.sessions"
        @filtered="filtered = $event"
      />
      <GroupListActions
        v-if="profile.isAdmin"
        :groups="filtered"
        :selected="selected"
        :can-bulk-tag="profile.isAdmin"
        @add-group="showAddGroup = true"
        @update:selected="selected = $event"
      />
      <GroupListResults
        :groups="filtered"
        :loading="groupsStore.loading || sessionsStore.loading"
        :error="groupsStore.error"
        :selected="profile.isAdmin ? selected : undefined"
        @update:selected="selected = $event"
      />
    </div>

    <GroupAddModal
      v-if="showAddGroup"
      :working="addGroupWorking"
      :error="addGroupError"
      @close="showAddGroup = false; addGroupError = ''"
      @add="onAddGroup"
    />
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import { usePageTitle } from '../composables/usePageTitle'
import PageHeader from '../components/PageHeader.vue'
import GroupListFilter from '../components/groups/GroupListFilter.vue'
import GroupListActions from '../components/groups/GroupListActions.vue'
import GroupListResults from '../components/groups/GroupListResults.vue'
import GroupAddModal from './modals/GroupAddModal.vue'
import type { AddGroupPayload } from './modals/GroupAddModal.vue'
import { useGroupListStore } from '../stores/groupList'
import { useSessionListStore } from '../stores/sessionList'
import { useViewer } from '../composables/useViewer'
import { groupPath } from '../router'
import type { GroupWithStats } from '../components/groups/GroupListFilter.vue'

usePageTitle('Groups')

const groupsStore = useGroupListStore()
const sessionsStore = useSessionListStore()
const profile = useViewer()
const router = useRouter()
const filtered = ref<GroupWithStats[]>([])
const selected = ref<number[]>([])
const showAddGroup = ref(false)
const addGroupWorking = ref(false)
const addGroupError = ref('')

async function onAddGroup(data: AddGroupPayload) {
  addGroupWorking.value = true
  addGroupError.value = ''
  try {
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(json.error || 'Failed to create group')
    }
    const json = await res.json()
    showAddGroup.value = false
    await groupsStore.fetch()
    if (json.data?.key) router.push(groupPath(json.data.key))
  } catch (e) {
    addGroupError.value = e instanceof Error ? e.message : 'An error occurred'
    console.error('[GroupListPage] onAddGroup', e)
  } finally {
    addGroupWorking.value = false
  }
}

onMounted(() => {
  groupsStore.fetch()
  sessionsStore.fetch()
})
</script>
