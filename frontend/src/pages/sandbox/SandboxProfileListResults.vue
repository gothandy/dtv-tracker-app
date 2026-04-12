<template>
  <DefaultLayout>
    <div class="sandbox">
      <SandboxBackLink />
      <h1>ProfileListResults</h1>
      <p class="sandbox-warning">Static mocked data — no API calls. Checkbox selection works locally.</p>

      <h2>Rolling FY — canSelect: true (admin checkboxes)</h2>
      <div class="demo">
        <ProfileListResults
          :profiles="mockProfiles"
          :selected="selected"
          :can-select="true"
          fy="rolling"
          @update:selected="selected = $event"
        />
      </div>
      <p class="plsr-note">Selected IDs: {{ selected.length ? selected.join(', ') : '(none)' }}</p>

      <h2>All FY — canSelect: false (read-only view)</h2>
      <div class="demo">
        <ProfileListResults
          :profiles="mockProfiles"
          :selected="[]"
          :can-select="false"
          fy="all"
        />
      </div>

      <h2>Loading state</h2>
      <div class="demo">
        <ProfileListResults
          :profiles="[]"
          :selected="[]"
          :can-select="true"
          :loading="true"
          fy="rolling"
        />
      </div>

      <h2>Empty state (no results)</h2>
      <div class="demo">
        <ProfileListResults
          :profiles="[]"
          :selected="[]"
          :can-select="true"
          :loading="false"
          fy="rolling"
        />
      </div>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import '../../styles/sandbox.css'
import { ref } from 'vue'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import SandboxBackLink from './SandboxBackLink.vue'
import ProfileListResults from '../../components/profiles/ProfileListResults.vue'
import { usePageTitle } from '../../composables/usePageTitle'
import type { ProfileResponse } from '../../../../types/api-responses'

usePageTitle('Sandbox')

const selected = ref<number[]>([])

const mockProfiles: ProfileResponse[] = [
  {
    id: 1, slug: 'alice-smith-1', name: 'Alice Smith', email: 'alice@example.com',
    isGroup: false, isMember: false, cardStatus: undefined,
    hoursLastFY: 10, hoursThisFY: 42.5, hoursAll: 97.5,
    sessionsLastFY: 4, sessionsThisFY: 18, sessionsAll: 42, records: [],
  },
  {
    id: 2, slug: 'bob-jones-2', name: 'Bob Jones', email: 'bob@example.com',
    isGroup: false, isMember: true, cardStatus: 'Accepted',
    hoursLastFY: 20, hoursThisFY: 27, hoursAll: 130,
    sessionsLastFY: 8, sessionsThisFY: 11, sessionsAll: 56, records: [],
  },
  {
    id: 3, slug: 'carol-white-3', name: 'Carol White', email: 'carol@example.com',
    isGroup: false, isMember: true, cardStatus: 'Invited',
    hoursLastFY: 5, hoursThisFY: 15, hoursAll: 45,
    sessionsLastFY: 2, sessionsThisFY: 6, sessionsAll: 18, records: [],
  },
  {
    id: 4, slug: 'saturday-dig-4', name: 'Saturday Dig', email: undefined,
    isGroup: true, isMember: false, cardStatus: undefined,
    hoursLastFY: 120, hoursThisFY: 312, hoursAll: 600,
    sessionsLastFY: 12, sessionsThisFY: 48, sessionsAll: 96, records: [],
  },
  {
    id: 5, slug: 'dave-brown-5', name: 'Dave Brown', email: 'dave@example.com',
    isGroup: false, isMember: false, cardStatus: undefined,
    hoursLastFY: 0, hoursThisFY: 0, hoursAll: 0,
    sessionsLastFY: 0, sessionsThisFY: 0, sessionsAll: 0, records: [],
  },
]
</script>

<style scoped>
.demo { outline: 1px solid var(--color-border); }
.plsr-note { font-size: 0.85rem; color: var(--color-text-muted); margin-top: 0.5rem; }
</style>
