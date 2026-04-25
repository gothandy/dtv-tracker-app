<template>
  <DefaultLayout>
    <div class="sandbox">
      <SandboxBackLink />
      <h1>ProfileListItem</h1>
      <p class="sandbox-warning">Static mocked data — no API calls.</p>

      <h2>No badges — has hours (standard volunteer)</h2>
      <div class="demo">
        <ProfileListItem :profile="standard" :display-hours="42.5" :display-sessions="18" />
      </div>

      <h2>Group profile (isGroup: true — group icon)</h2>
      <div class="demo">
        <ProfileListItem :profile="group" :display-hours="312" :display-sessions="48" />
      </div>

      <h2>Member (isMember: true — member badge)</h2>
      <div class="demo">
        <ProfileListItem :profile="member" :display-hours="27" :display-sessions="11" />
      </div>

      <h2>Card: Accepted (green card icon)</h2>
      <div class="demo">
        <ProfileListItem :profile="cardAccepted" :display-hours="18" :display-sessions="7" />
      </div>

      <h2>Card: Invited (orange card icon)</h2>
      <div class="demo">
        <ProfileListItem :profile="cardInvited" :display-hours="15" :display-sessions="6" />
      </div>

      <h2>All badges combined (member + card accepted + warning)</h2>
      <div class="demo">
        <ProfileListItem :profile="allBadges" :display-hours="56" :display-sessions="22" />
      </div>

      <h2>Zero hours</h2>
      <div class="demo">
        <ProfileListItem :profile="zeroHours" :display-hours="0" :display-sessions="0" />
      </div>

      <h2>No email (email field absent)</h2>
      <div class="demo">
        <ProfileListItem :profile="noEmail" :display-hours="8.5" :display-sessions="3" />
      </div>

      <h2>FY: All — shows hoursAll</h2>
      <div class="demo">
        <ProfileListItem :profile="standard" :display-hours="97.5" :display-sessions="42" />
      </div>

      <h2>With checkboxes — canSelect: true (admin view via ProfileListResults)</h2>
      <p class="sandbox-warning">IDs 1 and 3 pre-selected to show checked state.</p>
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
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import '../../styles/sandbox.css'
import { ref } from 'vue'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import SandboxBackLink from './SandboxBackLink.vue'
import ProfileListItem from '../../components/profiles/ProfileListItem.vue'
import ProfileListResults from '../../components/profiles/ProfileListResults.vue'
import { usePageTitle } from '../../composables/usePageTitle'
import type { ProfileResponse } from '../../../../types/api-responses'

usePageTitle('Sandbox')

const selected = ref<number[]>([1, 3])

const base: ProfileResponse = {
  id: 1,
  slug: 'alice-smith-1',
  name: 'Alice Smith',
  email: 'alice@example.com',
  user: undefined,
  isGroup: false,
  isMember: false,
  cardStatus: undefined,
  hoursLastFY: 10,
  hoursThisFY: 42.5,
  hoursAll: 97.5,
  sessionsLastFY: 4,
  sessionsThisFY: 18,
  sessionsAll: 42,
  records: [],
}

const standard: ProfileResponse = { ...base }

const group: ProfileResponse = {
  ...base,
  id: 2,
  slug: 'saturday-dig-2',
  name: 'Saturday Dig',
  isGroup: true,
  isMember: false,
  hoursThisFY: 312,
  sessionsThisFY: 48,
  hoursAll: 600,
  sessionsAll: 96,
}

const member: ProfileResponse = {
  ...base,
  id: 3,
  slug: 'bob-jones-3',
  name: 'Bob Jones',
  isMember: true,
  hoursThisFY: 27,
  sessionsThisFY: 11,
}

const cardAccepted: ProfileResponse = {
  ...base,
  id: 4,
  slug: 'carol-white-4',
  name: 'Carol White',
  isMember: true,
  cardStatus: 'Accepted',
  hoursThisFY: 18,
  sessionsThisFY: 7,
}

const cardInvited: ProfileResponse = {
  ...base,
  id: 5,
  slug: 'dave-brown-5',
  name: 'Dave Brown',
  isMember: true,
  cardStatus: 'Invited',
  hoursThisFY: 15,
  sessionsThisFY: 6,
}

const allBadges: ProfileResponse = {
  ...base,
  id: 9,
  slug: 'helen-ford-9',
  name: 'Helen Ford',
  isMember: true,
  cardStatus: 'Accepted',
  warnings: [{ text: 'Possible Duplicate', url: '/profiles?fy=all&search=Helen+Ford' }],
  hoursThisFY: 56,
  sessionsThisFY: 22,
}

const zeroHours: ProfileResponse = {
  ...base,
  id: 6,
  slug: 'eve-green-6',
  name: 'Eve Green',
  hoursThisFY: 0,
  sessionsThisFY: 0,
  hoursAll: 0,
  sessionsAll: 0,
}

const noEmail: ProfileResponse = {
  ...base,
  id: 8,
  slug: 'grace-hall-8',
  name: 'Grace Hall',
  email: undefined,
  hoursThisFY: 8.5,
  sessionsThisFY: 3,
}

const mockProfiles: ProfileResponse[] = [standard, group, member, cardAccepted, cardInvited]
</script>

<style scoped>
.demo { outline: 1px solid var(--color-border); }
.plsr-note { font-size: 0.85rem; color: var(--color-text-muted); margin-top: 0.5rem; }
</style>
