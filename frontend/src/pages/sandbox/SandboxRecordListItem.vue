<template>
  <DefaultLayout>
    <div class="sandbox">
      <SandboxBackLink />
      <h1>RecordListItem</h1>
      <p class="sandbox-warning">Static mocked data — no API calls.</p>

      <h2>Default, Active, Info, Warn</h2>
      <div class="demo srli-list">
        <RecordListItem v-for="r in examples" :key="r.id" :record="r" />
      </div>

      <h2>Selected</h2>
      <div class="demo srli-list">
        <RecordListItem v-for="r in examples.slice(1, 3)" :key="r.id" :record="r" selected />
      </div>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import '../../styles/sandbox.css'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import SandboxBackLink from './SandboxBackLink.vue'
import RecordListItem from '../../components/records/RecordListItem.vue'
import type { RecordStateStyle } from '../../../../types/record-state'
import { usePageTitle } from '../../composables/usePageTitle'
import type { RecordListItemResponse } from '../../../../types/api-responses'

usePageTitle('Sandbox')

const record = (id: number, type: string, label: string, style: RecordStateStyle | undefined, profileName: string, date: string, notes?: string): RecordListItemResponse => ({
  id, type, status: label, storedStatus: label, label, style, date, notes, profileId: id, profileName, profileSlug: `p-${id}`,
})

/** A From State shows its After label; an Until State its Before label up to its Date, then After. */
const examples: RecordListItemResponse[] = [
  record(1, 'Photo Consent', 'Declined', undefined, 'Alice Example', '2026-03-01'),
  record(2, 'Parking Permit', 'Expires', 'active', 'Bob Example', '2026-12-31', 'AB12 CDE, XY34 ZZZ'),
  record(3, 'Parking Permit', 'Invited', 'info', 'Cara Example', '2026-01-15'),
  record(4, 'First Aid Certificate', 'Expired', 'warn', 'Dan Example', '2025-08-22'),
  record(5, 'Privacy Consent', 'Given', 'active', 'Eve Example', '2026-02-24'),
]
</script>

<style scoped>
.srli-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
</style>
