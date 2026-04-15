<template>
  <DefaultLayout>
    <div class="sandbox">
      <SandboxBackLink />
      <h1>EntryListItem</h1>
      <p class="sandbox-warning">Static mocked data — no API calls.</p>

      <h2>Standard (not checked in)</h2>
      <div class="demo">
        <EntryListItem :entry="standard" />
      </div>

      <h2>Checked in (green left border)</h2>
      <div class="demo">
        <EntryListItem :entry="checkedIn" />
      </div>

      <h2>Selected (light background)</h2>
      <div class="demo">
        <EntryListItem :entry="standard" :selected="true" />
      </div>

      <h2>Checked in + selected</h2>
      <div class="demo">
        <EntryListItem :entry="checkedIn" :selected="true" />
      </div>

      <h2>With tag icons (#Child #New)</h2>
      <div class="demo">
        <EntryListItem :entry="withTags" />
      </div>

      <h2>Group entry (isGroup: true)</h2>
      <div class="demo">
        <EntryListItem :entry="groupEntry" />
      </div>

      <h2>Unknown volunteer (no name)</h2>
      <div class="demo">
        <EntryListItem :entry="noName" />
      </div>

      <h2>As a link (to prop provided)</h2>
      <div class="demo">
        <EntryListItem :entry="standard" to="/entries/1" />
      </div>

      <h2>Long name (overflow truncation)</h2>
      <div class="demo">
        <EntryListItem :entry="longName" />
      </div>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import '../../styles/sandbox.css'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import SandboxBackLink from './SandboxBackLink.vue'
import EntryListItem from '../../components/entries/EntryListItem.vue'
import { usePageTitle } from '../../composables/usePageTitle'
import type { EntryListItemResponse } from '../../../../types/api-responses'

usePageTitle('Sandbox')

const base: EntryListItemResponse = {
  id: 1,
  profileId: 10,
  volunteerName: 'Alice Smith',
  volunteerSlug: 'alice-smith-10',
  date: '2026-04-08',
  groupKey: 'wed-dig',
  groupName: 'Wednesday Dig',
  notes: undefined,
  checkedIn: false,
  hours: 4,
  count: 1,
  isGroup: false,
  hasAccompanyingAdult: false,
}

const standard: EntryListItemResponse = { ...base }

const checkedIn: EntryListItemResponse = { ...base, id: 2, checkedIn: true }

const withTags: EntryListItemResponse = {
  ...base, id: 3, volunteerName: 'Bob Jones', notes: '#Child #New',
}

const groupEntry: EntryListItemResponse = {
  ...base, id: 4, volunteerName: 'Saturday Crew', volunteerSlug: 'saturday-crew-20',
  isGroup: true, count: 6, groupName: 'Trail Crew',
}

const noName: EntryListItemResponse = {
  ...base, id: 5, volunteerName: undefined, volunteerSlug: undefined,
}

const longName: EntryListItemResponse = {
  ...base, id: 6,
  volunteerName: 'Bartholomew Christopher Windermere-Hutchinson',
  groupName: 'Wednesday Evening Woodland Conservation Dig',
}
</script>

<style scoped>
.demo { outline: 1px solid var(--color-border); }
</style>
