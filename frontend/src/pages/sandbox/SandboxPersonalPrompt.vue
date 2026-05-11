<template>
  <DefaultLayout>
    <div class="sandbox">
      <SandboxBackLink />
      <h1>PersonalPrompt</h1>
      <p>Banner: welcome line + single “Your Next Session” button (session URL or sessions list).</p>

      <h2>PersonalPrompt — welcome + next session</h2>
      <div class="pp-stack">
        <div class="pp-item">
          <p class="pp-label">Welcome to My Tracker</p>
          <PersonalPrompt :welcome="welcomeMy" :next-session="nextSession" />
        </div>
        <div class="pp-item">
          <p class="pp-label">Welcome to Tracker Assist</p>
          <PersonalPrompt :welcome="welcomeAssist" :next-session="nextSession" />
        </div>
        <div class="pp-item">
          <p class="pp-label">Welcome to Tracker Admin</p>
          <PersonalPrompt :welcome="welcomeAdmin" :next-session="nextSession" />
        </div>
        <div class="pp-item">
          <p class="pp-label">No upcoming session (button → /sessions)</p>
          <PersonalPrompt :welcome="welcomeMy" :next-session="null" />
        </div>
      </div>

      <h2>PersonalContainer (role → welcome)</h2>
      <div class="pp-stack">
        <div class="pp-item">
          <p class="pp-label">Admin</p>
          <PersonalContainer
            :is-admin="true"
            :is-check-in="false"
            :is-self-service="false"
            :next-session="nextSession"
          />
        </div>
        <div class="pp-item">
          <p class="pp-label">Tracker Assist only</p>
          <PersonalContainer
            :is-admin="false"
            :is-check-in="true"
            :is-self-service="false"
            :next-session="nextSession"
          />
        </div>
        <div class="pp-item">
          <p class="pp-label">My Tracker, no next session</p>
          <PersonalContainer
            :is-admin="false"
            :is-check-in="false"
            :is-self-service="true"
            :next-session="null"
          />
        </div>
      </div>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import '../../styles/sandbox.css'
import { usePageTitle } from '../../composables/usePageTitle'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import SandboxBackLink from './SandboxBackLink.vue'
import PersonalPrompt from '../../components/PersonalPrompt.vue'
import PersonalContainer from '../../components/PersonalContainer.vue'
import {
  ACCESS_LABEL_ADMIN,
  ACCESS_LABEL_CHECK_IN,
  ACCESS_LABEL_SELF_SERVICE,
} from '../../utils/accessLabels'

usePageTitle('Sandbox')

const nextSession = { groupKey: 'wednesday-dig', groupName: 'Wednesday Dig', date: '2026-04-20' }

const welcomeMy = `Welcome to ${ACCESS_LABEL_SELF_SERVICE}`
const welcomeAssist = `Welcome to ${ACCESS_LABEL_CHECK_IN}`
const welcomeAdmin = `Welcome to ${ACCESS_LABEL_ADMIN}`
</script>

<style scoped>
.pp-stack { display: flex; flex-direction: column; gap: 1.5rem; margin-bottom: 2rem; }
.pp-item  { display: flex; flex-direction: column; gap: 0.25rem; }
.pp-label { font-size: 0.8rem; font-family: monospace; opacity: 0.6; margin: 0; }
</style>
