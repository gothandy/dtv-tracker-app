<template>
  <DefaultLayout>
    <h1 class="sr-only">Records</h1>
    <PageHeader>Records</PageHeader>
    <RecordListFilter
      :records="store.records"
      @filtered="filtered = $event"
    />
    <RecordListActions :records="filtered" :selected="selected" />
    <RecordListResults
      :records="filtered"
      :loading="store.loading"
      :error="store.error"
      :selected="selected"
      allow-select
      :allow-edit="viewer.can('editRecords')"
      @update:selected="selected = $event"
      @edit-record="onEditRecord"
    />

    <RecordEditModal
      v-if="editingRecord"
      :record="editingRecord"
      :states="states"
      :title="editingRecord.profileName"
      :profile-click="editingRecord.profileSlug ? () => router.push(profilePath(editingRecord!.profileSlug!)) : undefined"
      :archive-click="editingRecord.profileId !== undefined && viewer.can('viewRecords') ? onViewArchive : undefined"
      :working="editWorking"
      :error="editError"
      @close="closeEditModal"
      @save="onSave"
      @delete="onDelete"
    />
  </DefaultLayout>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useRecordListStore } from '../stores/recordList'
import { useViewer } from '../composables/useViewer'
import type { RecordListItemResponse } from '../../../types/api-responses'
import type { RecordState } from '../../../types/record-state'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import PageHeader from '../components/PageHeader.vue'
import RecordListFilter from '../components/records/RecordListFilter.vue'
import RecordListActions from '../components/records/RecordListActions.vue'
import RecordListResults from '../components/records/RecordListResults.vue'
import RecordEditModal, { type SaveRecordPayload } from './modals/RecordEditModal.vue'
import { profilePath, recordsPath } from '../router/index'
import { pruneSelectionToVisible } from '../utils/listSelection'

const store = useRecordListStore()
const router = useRouter()
const viewer = useViewer()

const selected = ref<number[]>([])
const filtered = ref<RecordListItemResponse[]>([])
const states = ref<RecordState[]>([])
const editingRecord = ref<RecordListItemResponse | null>(null)
const editWorking = ref(false)
const editError = ref<string | undefined>()

watch(filtered, list => {
  const pruned = pruneSelectionToVisible(selected.value, list)
  if (pruned.length !== selected.value.length) selected.value = pruned
})

onMounted(async () => {
  store.fetch()
  try {
    const res = await fetch('/api/profiles/records/options')
    if (!res.ok) throw new Error(`Failed to load record options (${res.status})`)
    const json = await res.json()
    states.value = json.data?.states ?? []
  } catch (e) {
    console.error('[RecordsPage] failed to load record options', e)
  }
})

function onEditRecord(r: RecordListItemResponse) {
  editingRecord.value = r
}

/** This Record's Profile and Type: the filters change in place (RecordListFilter follows the address). */
function onViewArchive() {
  const r = editingRecord.value
  if (!r || r.profileId === undefined) return
  closeEditModal()
  router.push(recordsPath({ id: r.profileId, name: r.profileName, type: r.type }))
}

function closeEditModal() {
  editingRecord.value = null
  editWorking.value = false
  editError.value = undefined
}

async function onSave(payload: SaveRecordPayload) {
  if (!editingRecord.value) return
  editWorking.value = true
  editError.value = undefined
  try {
    const res = await fetch(`/api/records/${editingRecord.value.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`Save failed (${res.status})`)
    const saved = (await res.json()).data?.record
    const stored = store.records.find(r => r.id === editingRecord.value!.id)
    if (saved && stored) Object.assign(stored, saved)
    closeEditModal()
  } catch (e) {
    console.error('[RecordsPage] save failed', e)
    editError.value = 'Failed to save — please try again'
    editWorking.value = false
  }
}

async function onDelete() {
  if (!editingRecord.value) return
  editWorking.value = true
  editError.value = undefined
  try {
    const id = editingRecord.value.id
    const res = await fetch(`/api/records/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(`Delete failed (${res.status})`)
    store.records = store.records.filter(r => r.id !== id)
    selected.value = selected.value.filter(x => x !== id)
    closeEditModal()
  } catch (e) {
    console.error('[RecordsPage] delete failed', e)
    editError.value = 'Failed to delete — please try again'
    editWorking.value = false
  }
}
</script>
