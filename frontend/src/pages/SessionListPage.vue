<template>
  <DefaultLayout>
    <h1 class="sr-only">Sessions</h1>
    <PageHeader>Sessions</PageHeader>
    <div class="pb-6">
      <SessionListFilter :sessions="store.sessions" @filtered="filtered = $event" />
      <SessionListActions
        :sessions="filtered"
        :can-bulk-tag="profile.isAdmin"
        v-model:selected="selected"
        @add-tags="showTagModal = true"
        @add-session="showAddSession = true"
      />
      <SessionListResults :sessions="filtered" :loading="store.loading" v-model:selected="selected" />
    </div>

    <SessionAddTagsModal
      v-if="showTagModal"
      :count="selected.length"
      :working="tagWorking"
      :error="tagError"
      @close="showTagModal = false"
      @save="onApplyTag"
    />

    <GroupAddSessionModal
      v-if="showAddSession"
      :groups="groupOptions"
      :working="addSessionWorking"
      :error="addSessionError"
      @close="showAddSession = false"
      @add="onAddSession"
    />
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import { usePageTitle } from '../composables/usePageTitle'
import PageHeader from '../components/PageHeader.vue'
import SessionListFilter from '../components/sessions/SessionListFilter.vue'
import SessionListActions from '../components/sessions/SessionListActions.vue'
import SessionListResults from '../components/sessions/SessionListResults.vue'
import SessionAddTagsModal from './modals/SessionAddTagsModal.vue'
import GroupAddSessionModal from './modals/GroupAddSessionModal.vue'
import type { AddSessionPayload } from './modals/GroupAddSessionModal.vue'
import { useSessionListStore } from '../stores/sessionList'
import { useGroupListStore } from '../stores/groupList'
import { useViewer } from '../composables/useViewer'
import { useRouter } from 'vue-router'
import { sessionPath } from '../router'
import type { Session } from '../types/session'

usePageTitle('Sessions')

const store = useSessionListStore()
const groupsStore = useGroupListStore()
const profile = useViewer()
const router = useRouter()
const filtered = ref<Session[]>([])
const selected = ref<number[]>([])
const showTagModal = ref(false)
const tagWorking = ref(false)
const tagError = ref('')
const showAddSession = ref(false)
const addSessionWorking = ref(false)
const addSessionError = ref('')

store.fetch()
groupsStore.fetch()

const groupOptions = computed(() =>
  groupsStore.groups
    .map(g => ({ id: g.id, key: g.key, displayName: g.displayName }))
    .sort((a, b) => (a.displayName ?? a.key).localeCompare(b.displayName ?? b.key))
)

async function onApplyTag(label: string, termGuid: string) {
  tagWorking.value = true
  tagError.value = ''
  const tag = { label, termGuid }
  const res = await fetch('/api/sessions/bulk-tag', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionIds: selected.value, tags: [tag] }),
  })
  if (!res.ok) {
    tagError.value = 'Bulk tag failed — please try again'
    tagWorking.value = false
    console.error('[SessionListPage] bulk-tag failed', res.status)
    return
  }
  store.applyTag(selected.value, tag)
  showTagModal.value = false
  tagWorking.value = false
  tagError.value = ''
  selected.value = []
}

async function onAddSession(data: AddSessionPayload) {
  addSessionWorking.value = true
  addSessionError.value = ''
  try {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(json.error || 'Failed to create session — please try again')
    }
    const json = await res.json()
    showAddSession.value = false
    await store.fetch()
    if (json.data?.groupKey && json.data?.date) {
      router.push(sessionPath(json.data.groupKey, json.data.date))
    }
  } catch (e) {
    addSessionError.value = e instanceof Error ? e.message : 'An error occurred'
    console.error('[SessionListPage] add-session failed', e)
  } finally {
    addSessionWorking.value = false
  }
}
</script>
