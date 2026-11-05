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
      :is-current="isCurrentRecord(store.records, editingRecord)"
      :working="editWorking"
      :error="editError"
      @close="closeEditModal"
      @change-state="onChangeState"
      @save="onSave"
      @delete="onDelete"
    />

    <RecordAddModal
      v-if="adding"
      :states="states"
      :initial-type="adding.type"
      :initial-state="adding.state"
      :working="addWorking"
      :error="addError"
      @close="adding = null"
      @add="onAdd"
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
import RecordAddModal, { type AddRecordPayload } from './modals/RecordAddModal.vue'
import { isCurrentRecord } from '../utils/currentRecord'
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

/** Add Record, opened from Edit's change of State: the Record it follows (its Profile), and the new State. */
const adding = ref<{ from: RecordListItemResponse; type: string; state: string } | null>(null)
const addWorking = ref(false)
const addError = ref<string | undefined>()

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

/** A new State for the current Record: add a new Record for the same Profile and Type (#322 §1). */
function onChangeState(state: string) {
  const from = editingRecord.value
  if (!from) return
  closeEditModal()
  adding.value = { from, type: from.type, state }
  addWorking.value = false
  addError.value = undefined
}

async function onAdd(payload: AddRecordPayload) {
  const from = adding.value?.from
  if (!from || from.profileId === undefined) return
  addWorking.value = true
  addError.value = undefined
  try {
    const res = await fetch(`/api/profiles/${from.profileId}/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`Add failed (${res.status})`)
    const record = (await res.json()).data?.record
    if (record) {
      store.records = [...store.records, { ...record, profileId: from.profileId, profileName: from.profileName, profileSlug: from.profileSlug }]
    }
    adding.value = null
  } catch (e) {
    console.error('[RecordsPage] add failed', e)
    addError.value = 'Failed to add — please try again'
  } finally {
    addWorking.value = false
  }
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
