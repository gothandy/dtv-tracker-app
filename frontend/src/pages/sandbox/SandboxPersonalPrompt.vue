<template>
  <DefaultLayout>
    <div class="sandbox">
      <SandboxBackLink />
      <h1>PersonalPrompt</h1>
      <p>Presentational banner rendered by PersonalContainer. All variants shown with static props.</p>

      <h2>Role messages</h2>
      <div class="pp-stack">
        <div class="pp-item">
          <p class="pp-label">isAdmin / isReadOnly</p>
          <PersonalPrompt
            message="You're a DTV Tracker admin"
            :next-session="nextSession"
            :previous-session="previousSession"
          />
        </div>
        <div class="pp-item">
          <p class="pp-label">isCheckIn</p>
          <PersonalPrompt
            message="Ready to manage your sessions and volunteers"
            :next-session="nextSession"
            :previous-session="previousSession"
          />
        </div>
      </div>

      <h2>Self-service volunteer messages</h2>
      <div class="pp-stack">
        <div class="pp-item">
          <p class="pp-label">isNew + hasBooking</p>
          <PersonalPrompt
            message="Your first Wednesday Dig is booked, read all about it"
            :next-session="nextSession"
            :previous-session="null"
          />
        </div>
        <div class="pp-item">
          <p class="pp-label">isRepeat + hasBooking</p>
          <PersonalPrompt
            message="Your next Wednesday Dig is booked, check the details"
            :next-session="nextSession"
            :previous-session="previousSession"
          />
        </div>
        <div class="pp-item">
          <p class="pp-label">isNew + !hasBooking + hasAttended</p>
          <PersonalPrompt
            message="You completed your first Wednesday Dig, see photos and get booked on the next"
            :next-session="null"
            :previous-session="previousSession"
          />
        </div>
        <div class="pp-item">
          <p class="pp-label">isRegular + hasBooking</p>
          <PersonalPrompt
            message="You're booked onto Wednesday Dig, check the latest details"
            :next-session="nextSession"
            :previous-session="previousSession"
          />
        </div>
        <div class="pp-item">
          <p class="pp-label">isRegular + !hasBooking</p>
          <PersonalPrompt
            message="Catch up on Wednesday Dig and check what's coming up next"
            :next-session="null"
            :previous-session="previousSession"
          />
        </div>
      </div>

      <h2>No message (null) — nothing should render</h2>
      <div class="pp-item">
        <p class="pp-label">PersonalContainer with no matching condition</p>
        <PersonalContainer
          :is-admin="false"
          :is-check-in="false"
          :is-read-only="false"
          :is-self-service="false"
          :is-new="false"
          :is-repeat="false"
          :is-regular="false"
          :has-booking="false"
          :has-attended="false"
          :next-session="null"
          :previous-session="null"
        />
        <p class="pp-empty-note">↑ nothing visible above this line = correct</p>
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

usePageTitle('Sandbox')

const nextSession     = { groupKey: 'wednesday-dig', groupName: 'Wednesday Dig', date: '2026-04-20' }
const previousSession = { groupKey: 'wednesday-dig', groupName: 'Wednesday Dig', date: '2026-03-16' }
</script>

<style scoped>
.pp-stack { display: flex; flex-direction: column; gap: 1.5rem; margin-bottom: 2rem; }
.pp-item  { display: flex; flex-direction: column; gap: 0.25rem; }
.pp-label { font-size: 0.8rem; font-family: monospace; opacity: 0.6; margin: 0; }
.pp-empty-note { font-size: 0.8rem; font-style: italic; opacity: 0.5; margin: 0.25rem 0 0; }
</style>
