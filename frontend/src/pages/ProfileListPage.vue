<template>
  <DefaultLayout>
    <h1 class="sr-only">Profiles</h1>
    <PageHeader>Profiles</PageHeader>
    <ProfileListFilter
      :profiles="store.profiles"
      :groups="groupsStore.groups"
      :record-options="recordOptions"
      @filtered="filtered = $event"
      @filters-change="onFiltersChange"
    />
    <ProfileListActions
      :filtered-profiles="filtered"
      :selected="selected"
      :can-bulk-edit="profile.isAdmin"
      :fy="fy"
      @add-records="showBulkModal = true"
      @update:selected="selected = $event"
    />
    <ProfileListResults
      :profiles="filtered"
      :loading="store.loading"
      :selected="selected"
      :can-select="profile.isAdmin"
      :fy="fy"
      @update:selected="selected = $event"
    />

    <ProfileBulkRecordsModal
      v-if="showBulkModal"
      :count="individualSelectedCount"
      :record-options="recordOptions"
      :working="bulkWorking"
      :error="bulkError"
      @close="showBulkModal = false"
      @save="onBulkSave"
    />
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import PageHeader from '../components/PageHeader.vue'
import ProfileListFilter from '../components/profiles/ProfileListFilter.vue'
import ProfileListActions from '../components/profiles/ProfileListActions.vue'
import ProfileListResults from '../components/profiles/ProfileListResults.vue'
import ProfileBulkRecordsModal from './modals/ProfileBulkRecordsModal.vue'
import type { BulkRecordPayload } from './modals/ProfileBulkRecordsModal.vue'
import { usePageTitle } from '../composables/usePageTitle'
import { useViewer } from '../composables/useViewer'
import { useProfileListStore } from '../stores/profileList'
import { useGroupListStore } from '../stores/groupList'
import type { ProfileResponse } from '../../../types/api-responses'

usePageTitle('Profiles')

const profile = useViewer()
const store = useProfileListStore()
const groupsStore = useGroupListStore()

const fy = ref('rolling')
const group = ref('')
const filtered = ref<ProfileResponse[]>([])
const selected = ref<number[]>([])
const showBulkModal = ref(false)
const bulkWorking = ref(false)
const bulkError = ref('')
const recordOptions = ref<{ types: string[]; statuses: string[] }>({ types: [], statuses: [] })

// Individual (non-group) profile IDs from current selection
const individualSelectedCount = computed(() =>
  selected.value.filter(id => {
    const p = store.profiles.find(x => x.id === id)
    return p && !p.isGroup
  }).length
)

function onFiltersChange({ fy: newFy, group: newGroup }: { fy: string; group: string }) {
  fy.value = newFy
  group.value = newGroup
  store.fetch(newFy, newGroup)
}

async function onBulkSave(payload: BulkRecordPayload) {
  bulkWorking.value = true
  bulkError.value = ''
  try {
    const individualIds = selected.value.filter(id => {
      const p = store.profiles.find(x => x.id === id)
      return p && !p.isGroup
    })
    const res = await fetch('/api/records/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileIds: individualIds, ...payload }),
    })
    if (!res.ok) throw new Error(`Bulk records failed (${res.status})`)
    showBulkModal.value = false
    selected.value = []
    await store.fetch(fy.value, group.value)
  } catch (e) {
    bulkError.value = e instanceof Error ? e.message : 'An error occurred'
    console.error('[ProfileListPage] onBulkSave', e)
  } finally {
    bulkWorking.value = false
  }
}

onMounted(async () => {
  groupsStore.fetch()
  // Initial profiles fetch is driven by the immediate filters-change watcher in ProfileListFilter
  try {
    const res = await fetch('/api/records/options')
    if (res.ok) {
      const json = await res.json()
      recordOptions.value = json.data ?? { types: [], statuses: [] }
    }
  } catch (e) {
    console.error('[ProfileListPage] failed to load record options', e)
  }
})
</script>
