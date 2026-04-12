<template>
  <DefaultLayout>
    <div class="sandbox">

      <SandboxBackLink />
      <h1>GroupCard</h1>

      <h2>With description and Eventbrite</h2>

      <LayoutColumns ratio="1-1-1">
        <template #left>
          <GroupCard :group="withDescription" />
        </template>
        <template #middle>
          <GroupCard :group="withoutDescription" />
        </template>
        <template #right>
          <GroupCard :group="withRegulars" />
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
import GroupCard from '../../components/groups/GroupCard.vue'
import { usePageTitle } from '../../composables/usePageTitle'
import type { GroupWithStats } from '../../components/groups/GroupListFilter.vue'

usePageTitle('Sandbox')

const base: GroupWithStats = {
  id: 1,
  key: 'wed',
  displayName: 'Wednesday Dig',
  description: 'Our popular mid-week dig, usually working on some of our best-loved red trails, rounded off with a cuppa and a ride.',
  eventbriteSeriesId: 'eb-123',
  regularsCount: 0,
  regulars: [],
  sessionCount: 27,
  hours: 1290.8,
}

const withDescription: GroupWithStats = { ...base }

const withoutDescription: GroupWithStats = {
  ...base,
  id: 2,
  key: 'sat',
  displayName: 'Saturday Dig',
  description: undefined,
  eventbriteSeriesId: undefined,
  sessionCount: 14,
  hours: 420,
}

const withRegulars: GroupWithStats = {
  ...base,
  id: 3,
  key: 'sheepskull',
  displayName: 'Dean Heritage Sheepskull Crew',
  description: 'We maintain the Sheepskull trails in the Forest of Dean, keeping singletrack flowing and berms banked for all riders.',
  eventbriteSeriesId: undefined,
  regularsCount: 8,
  sessionCount: 19,
  hours: 760.5,
}
</script>

