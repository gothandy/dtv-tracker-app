<template>
  <DefaultLayout>
    <div v-if="store.loading" class="pd-loading">Loading…</div>
    <div v-else-if="store.error" class="pd-error">{{ store.error }}</div>
    <template v-else-if="store.profile">
      <h1 class="sr-only">{{ store.profile.name ?? 'Profile' }}</h1>
      <PageHeader>{{ store.profile.name ?? 'Profile' }}</PageHeader>

      <LayoutColumns ratio="1">
        <template #header><SectionHeader>Your volunteering</SectionHeader></template>
        <template #left>
          <ProfileEntryList
            :entries="entries"
            :allow-edit="viewer.isOperational"
            :working-id="workingId"
            ref="entryListRef"
            @update="onEntryUpdate"
            @edit-entry="onEditEntry"
          />
        </template>
      </LayoutColumns>

      <DebugData :item="store.profile" label="pageProfile" />
      <DebugData :item="viewer.context" label="userProfile" />
    </template>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import DebugData from '../components/DebugData.vue'
import PageHeader from '../components/PageHeader.vue'
import ProfileEntryList from '../components/profiles/ProfileEntryList.vue'
import { useViewer } from '../composables/useViewer'
import { usePageTitle } from '../composables/usePageTitle'
import { useProfileDetailStore } from '../stores/profileDetail'
import type { ProfileEntryResponse } from '../../../types/api-responses'
import type { EntryItem } from '../types/entry'
import LayoutColumns from '../components/LayoutColumns.vue'
import SectionHeader from '../components/SectionHeader.vue'

const route = useRoute()
const viewer = useViewer()
const store = useProfileDetailStore()
const workingId = ref<number | null>(null)

usePageTitle(computed(() => store.profile?.name ?? 'Profile'))
const entryListRef = ref<InstanceType<typeof ProfileEntryList> | null>(null)

onMounted(() => store.fetch(route.params.slug as string))
watch(() => route.params.slug, slug => { if (slug) store.fetch(slug as string) })

function mapProfileEntry(e: ProfileEntryResponse): EntryItem {
  return {
    id: e.id,
    checkedIn: e.checkedIn,
    hours: e.hours,
    count: e.count,
    notes: e.notes,
    profile: {
      name: store.profile?.name ?? 'Unknown',
      slug: store.profile?.slug,
      isMember: false,
      cardStatus: undefined,
      isGroup: store.profile?.isGroup ?? false,
    },
    session: {
      groupKey: e.groupKey ?? '',
      groupName: e.groupName ?? '',
      date: e.date,
    },
  }
}

const entries = computed<EntryItem[]>(() => (store.profile?.entries ?? []).map(mapProfileEntry))

type EditData = { checkedIn: boolean; count: number; hours: number; notes: string }

async function onEntryUpdate(entry: EntryItem, checkedIn: boolean, hours: number) {
  workingId.value = entry.id
  try {
    const res = await fetch(`/api/entries/${entry.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkedIn, hours }),
    })
    if (!res.ok) throw new Error(`Update failed (${res.status})`)
    const stored = store.profile?.entries.find(e => e.id === entry.id)
    if (stored) { stored.checkedIn = checkedIn; stored.hours = hours }
  } catch (e) {
    console.error('[ProfileDetailPage] onEntryUpdate failed', e)
  } finally {
    workingId.value = null
  }
}

async function onEditEntry(id: number, data: EditData | null) {
  try {
    if (data === null) {
      const res = await fetch(`/api/entries/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`Delete failed (${res.status})`)
      if (store.profile) {
        store.profile.entries = store.profile.entries.filter(e => e.id !== id)
      }
    } else {
      const res = await fetch(`/api/entries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error(`Save failed (${res.status})`)
      const stored = store.profile?.entries.find(e => e.id === id)
      if (stored) {
        stored.checkedIn = data.checkedIn
        stored.hours = data.hours
        stored.count = data.count
        stored.notes = data.notes
      }
    }
    entryListRef.value?.onEditSuccess()
  } catch (e) {
    console.error('[ProfileDetailPage] onEditEntry failed', e)
    entryListRef.value?.onEditError('Failed to save — please try again')
  }
}
</script>
