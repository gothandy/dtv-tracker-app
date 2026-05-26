<template>
  <DefaultLayout>
    <div class="sandbox">

      <SandboxBackLink />
      <h1>SessionCard</h1>

      <h2>Public — upcoming</h2>

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

      <h2>Public — past</h2>

      <LayoutColumns ratio="1-1-1">
        <template #left>
          <SessionCard :session="pastWithSessionCopy" />
        </template>
        <template #middle>
          <SessionCard :session="pastNoDisplayName" />
        </template>
        <template #right>
          <SessionCard :session="pastNoDescription" />
        </template>
      </LayoutColumns>

      <h2>Tracker Assist / Tracker Admin — upcoming</h2>

      <LayoutColumns ratio="1-1-1">
        <template #left>
          <SessionCard :session="adminSession" :profile="adminProfile" />
        </template>
      </LayoutColumns>

      <h2>Tracker Assist / Tracker Admin — past</h2>

      <LayoutColumns ratio="1-1-1">
        <template #left>
          <SessionCard :session="pastWithSessionCopy" :profile="adminProfile" />
        </template>
      </LayoutColumns>

    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import '../../styles/sandbox.css'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import SandboxBackLink from './SandboxBackLink.vue'
import LayoutColumns from '../../components/LayoutColumns.vue'
import SessionCard from '../../components/sessions/SessionCard.vue'
import { usePageTitle } from '../../composables/usePageTitle'
import type { Session } from '../../types/session'
import type { RoleContext } from '../../composables/useViewer'

usePageTitle('Sandbox')

const adminProfile: RoleContext = {
  isAdmin: true, isCheckIn: false,
  isSelfService: false, isTrusted: true, isAuthenticated: true,
  isPublic: false, hasCheckInAccess: true,
}

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
  isBookable: true,
  limits: { new: 4, total: 16 },
  stats: { count: 3, hours: 0 },
  isRegistered: false,
  isAttended: false,
  isRegular: false,
}

const adminSession: Session = {
  ...base,
  id: 4,
  stats: { count: 18, hours: 72, new: 1, child: 2, regular: 12, eventbrite: 6 },
  regularsCount: 14,
  limits: { new: 4, total: 20 },
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
  stats: { count: 16, hours: 0 },
}

const pastBase: Session = {
  ...base,
  date: '2025-11-08',
  financialYear: '2025-26',
  isBookable: false,
  stats: { count: 14, hours: 56 },
}

const pastWithSessionCopy: Session = {
  ...pastBase,
  id: 5,
  displayName: 'Sheepskull trail maintenance — November',
  description: 'Banked berms on the lower loop and cleared drainage on the climb out of the valley.',
}

const pastNoDisplayName: Session = {
  ...pastBase,
  id: 6,
  displayName: undefined,
  description: 'Regular Saturday crew session.',
}

const pastNoDescription: Session = {
  ...pastBase,
  id: 7,
  displayName: 'Autumn litter pick',
  description: undefined,
}
</script>

