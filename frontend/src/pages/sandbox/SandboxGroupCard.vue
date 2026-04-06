<template>
  <DefaultLayout>
    <div class="sandbox">

      <RouterLink to="/sandbox" class="back">← Sandbox</RouterLink>
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
import DefaultLayout from '../../layouts/DefaultLayout.vue'
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
