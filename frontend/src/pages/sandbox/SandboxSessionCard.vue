<template>
  <DefaultLayout>
    <div class="sandbox">

      <RouterLink to="/sandbox" class="back">← Sandbox</RouterLink>
      <h1>SessionCard</h1>

      <h2>Public</h2>

      <LayoutColumns ratio="1-1-1">
        <template #left>
          <SessionCard :session="futureWithDescription" />
        </template>
        <template #middle>
          <SessionCard :session="futureNoDescription" />
        </template>
        <template #right>
          <SessionCard :session="futureFullyBooked" />
        </template>
      </LayoutColumns>

    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import LayoutColumns from '../../components/LayoutColumns.vue'
import SessionCard from '../../components/sessions/SessionCard.vue'
import { usePageTitle } from '../../composables/usePageTitle'
import type { Session } from '../../types/session'

usePageTitle('Sandbox')

const base: Session = {
  id: 1,
  date: '2026-04-19',
  groupId: 10,
  groupKey: 'dhsc',
  groupName: 'Dean Heritage Sheepskull Crew',
  groupDescription: 'We maintain the Sheepskull trails in the Forest of Dean, keeping singletrack flowing and berms banked for all riders.',
  displayName: undefined,
  description: undefined,
  financialYear: '2026-27',
  spacesAvailable: 12,
  registrations: 3,
  hours: 0,
  isRegistered: false,
  isAttended: false,
  isRegular: false,
}

const futureWithDescription: Session = { ...base }

const futureNoDescription: Session = {
  ...base,
  id: 2,
  groupDescription: undefined,
}

const futureFullyBooked: Session = {
  ...base,
  id: 3,
  spacesAvailable: 0,
}
</script>

<style scoped>
.sandbox {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.back { color: var(--color-dtv-green); text-decoration: none; font-size: 0.9rem; }
.back:hover { text-decoration: underline; }

h1 {
  font-size: 1.5rem;
  font-weight: 700;
}

h2 { font-size: 1rem; font-weight: 600; color: var(--color-text-muted); margin-bottom: 0.5rem; }
</style>
