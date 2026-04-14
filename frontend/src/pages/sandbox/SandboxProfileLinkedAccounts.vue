<template>
  <DefaultLayout>
    <div class="sandbox">

      <SandboxBackLink />
      <h1>ProfileLinkedAccounts</h1>

      <h2>Single linked profile</h2>
      <div class="demo">
        <ProfileLinkedAccounts :linked-profiles="singleLinked" />
      </div>

      <h2>Multiple linked profiles</h2>
      <div class="demo">
        <ProfileLinkedAccounts :linked-profiles="multiLinked" />
      </div>

      <h2>Empty — renders nothing</h2>
      <div class="demo">
        <ProfileLinkedAccounts :linked-profiles="[]" />
        <p class="sandbox-hint">(nothing rendered)</p>
      </div>

    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import '../../styles/sandbox.css'
import { usePageTitle } from '../../composables/usePageTitle'
usePageTitle('Sandbox')
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import SandboxBackLink from './SandboxBackLink.vue'
import ProfileLinkedAccounts from '../../components/profiles/ProfileLinkedAccounts.vue'

const singleLinked = [
  { id: 10, slug: 'bob-carter-10', name: 'Bob Carter' },
]

const multiLinked = [
  { id: 10, slug: 'bob-carter-10', name: 'Bob Carter' },
  { id: 11, slug: 'carol-davies-11', name: 'Carol Davies' },
  { id: 12, slug: 'david-evans-12', name: 'David Evans' },
]
</script>

<style scoped>
.sandbox-hint {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  font-style: italic;
  padding: 0.5rem 1.5rem;
  margin: 0;
}
</style>
