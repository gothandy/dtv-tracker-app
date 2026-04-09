<template>
  <DefaultLayout>
    <h1 class="sr-only">Sessions</h1>
    <PageHeader>Sessions</PageHeader>
    <div class="px-6 pb-6">
      <SessionListFilter :sessions="store.sessions" @filtered="filtered = $event" />
      <SessionListActions
        ref="actionsRef"
        :sessions="filtered"
        :can-bulk-tag="profile.isAdmin"
        v-model:selected="selected"
        @apply-tag="onApplyTag"
      />
      <SessionListResults :sessions="filtered" :loading="store.loading" v-model:selected="selected" />
    </div>
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
import { useSessionsStore } from '../stores/sessions'
import { useProfile } from '../composables/useProfile'
import type { Session } from '../types/session'

usePageTitle('Sessions')

const store = useSessionsStore()
const profile = useProfile()
const filtered = ref<Session[]>([])
const selected = ref<number[]>([])
const actionsRef = ref<InstanceType<typeof SessionListActions> | null>(null)

store.fetch()

async function onApplyTag(label: string, termGuid: string) {
  const tag = { label, termGuid }
  const res = await fetch('/api/sessions/bulk-tag', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionIds: selected.value, tags: [tag] }),
  })
  if (!res.ok) {
    actionsRef.value?.onTagError('Bulk tag failed — please try again')
    console.error('[SessionListPage] bulk-tag failed', res.status)
    return
  }
  store.applyTag(selected.value, tag)
  actionsRef.value?.onTagSuccess()
  selected.value = []
}
</script>
