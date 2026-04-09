<template>
  <DefaultLayout>
    <h1 class="sr-only">{{ pageProfile?.name ?? 'Profile' }}</h1>
    <PageHeader>{{ pageProfile?.name ?? 'Profile' }}</PageHeader>

    <LayoutColumns ratio="1">
      <template #header><SectionHeader>Your volunteering</SectionHeader></template>
      <template #left>
        <ProfileEntryList
          v-if="pageProfile"
          :entries="entries"
          :profile="profile.context"
          :working-id="workingId"
          ref="entryListRef"
          @update="onEntryUpdate"
          @edit-entry="onEditEntry"
        />
      </template>
    </LayoutColumns>

    <DebugData :item="pageProfile ?? {}" label="pageProfile" />
    <DebugData :item="profile.context" label="userProfile" />
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import DebugData from '../components/DebugData.vue'
import PageHeader from '../components/PageHeader.vue'
import ProfileEntryList from '../components/profiles/ProfileEntryList.vue'
import { useProfile } from '../composables/useProfile'
import { usePageTitle } from '../composables/usePageTitle'
import type { ProfileDetailResponse, ProfileEntryResponse } from '../../../types/api-responses'
import type { EntryItem } from '../types/entry'
import LayoutColumns from '../components/LayoutColumns.vue'
import SectionHeader from '../components/SectionHeader.vue'

const route = useRoute()
const profile = useProfile()

const pageProfile = ref<ProfileDetailResponse | null>(null)
const workingId = ref<number | null>(null)

usePageTitle(computed(() => pageProfile.value?.name ?? 'Profile'))
const entryListRef = ref<InstanceType<typeof ProfileEntryList> | null>(null)

watchEffect(async () => {
  const slug = route.params.slug as string
  pageProfile.value = null
  try {
    const res = await window.fetch(`/api/profiles/${slug}`)
    if (!res.ok) throw new Error(`Failed to load profile (${res.status})`)
    const json: { data: ProfileDetailResponse } = await res.json()
    pageProfile.value = json.data
  } catch (e) {
    console.error('[ProfileDetailPage]', e)
  }
})

function mapProfileEntry(e: ProfileEntryResponse): EntryItem {
  return {
    id: e.id,
    checkedIn: e.checkedIn,
    hours: e.hours,
    count: e.count,
    notes: e.notes,
    profile: {
      name: pageProfile.value?.name ?? 'Unknown',
      slug: pageProfile.value?.slug,
      isMember: false,
      cardStatus: undefined,
      isGroup: pageProfile.value?.isGroup ?? false,
    },
    session: {
      groupKey: e.groupKey ?? '',
      groupName: e.groupName ?? '',
      date: e.date,
    },
  }
}

const entries = computed<EntryItem[]>(() => (pageProfile.value?.entries ?? []).map(mapProfileEntry))

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
    const stored = pageProfile.value?.entries.find(e => e.id === entry.id)
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
      if (pageProfile.value) {
        pageProfile.value.entries = pageProfile.value.entries.filter(e => e.id !== id)
      }
    } else {
      const res = await fetch(`/api/entries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error(`Save failed (${res.status})`)
      const stored = pageProfile.value?.entries.find(e => e.id === id)
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
