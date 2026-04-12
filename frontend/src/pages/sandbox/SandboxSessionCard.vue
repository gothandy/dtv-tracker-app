<template>
  <DefaultLayout>
    <div class="sandbox">

      <SandboxBackLink />
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

      <h2>Admin / Check-In</h2>

      <LayoutColumns ratio="1-1-1">
        <template #left>
          <SessionCard :session="adminSession" :profile="adminProfile" />
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
  isAdmin: true, isCheckIn: false, isReadOnly: false,
  isSelfService: false, isTrusted: true, isAuthenticated: true,
  isPublic: false, isOperational: true,
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
  registrations: 3,
  hours: 0,
  isRegistered: false,
  isAttended: false,
  isRegular: false,
}

const adminSession: Session = {
  ...base,
  id: 4,
  registrations: 18,
  newCount: 1,
  childCount: 2,
  regularCount: 12,
  regularsCount: 14,
  eventbriteCount: 6,
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
  registrations: 16,
}
</script>

