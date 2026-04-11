<template>
  <DefaultLayout>
    <h1 class="sr-only">Sessions</h1>
    <PageHeader>Sessions</PageHeader>
    <div class="px-6 pb-6">
      <SessionListFilter :sessions="store.sessions" @filtered="filtered = $event" />
      <SessionListActions
        :sessions="filtered"
        :can-bulk-tag="profile.isAdmin"
        v-model:selected="selected"
        @add-tags="showTagModal = true"
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
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import { usePageTitle } from '../composables/usePageTitle'
import PageHeader from '../components/PageHeader.vue'
import SessionListFilter from '../components/sessions/SessionListFilter.vue'
import SessionListActions from '../components/sessions/SessionListActions.vue'
import SessionListResults from '../components/sessions/SessionListResults.vue'
import SessionAddTagsModal from './modals/SessionAddTagsModal.vue'
import { useSessionListStore } from '../stores/sessionList'
import { useViewer } from '../composables/useViewer'
import type { Session } from '../types/session'

usePageTitle('Sessions')

const store = useSessionListStore()
const profile = useViewer()
const filtered = ref<Session[]>([])
const selected = ref<number[]>([])
const showTagModal = ref(false)
const tagWorking = ref(false)
const tagError = ref('')

store.fetch()

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
</script>
