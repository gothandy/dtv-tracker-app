<template>
  <DefaultLayout>
    <div class="sandbox">

      <SandboxBackLink />
      <h1>ProfileDuplicateWarning</h1>

      <h2>Red — likely duplicate (same name and email)</h2>
      <div class="demo">
        <ProfileDuplicateWarning :duplicates="[redDuplicate]" />
      </div>

      <h2>Orange — possible duplicate (same name, different email)</h2>
      <div class="demo">
        <ProfileDuplicateWarning :duplicates="[orangeDuplicate]" />
      </div>

      <h2>Green — similar profile (different display name)</h2>
      <div class="demo">
        <ProfileDuplicateWarning :duplicates="[greenDuplicate]" />
      </div>

      <h2>All severities together</h2>
      <div class="demo">
        <ProfileDuplicateWarning :duplicates="allDuplicates" />
      </div>

      <h2>Empty — renders nothing</h2>
      <div class="demo">
        <ProfileDuplicateWarning :duplicates="[]" />
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
import ProfileDuplicateWarning from '../../components/profiles/ProfileDuplicateWarning.vue'
import type { ProfileDuplicateResponse } from '../../../../types/api-responses'

const redDuplicate: ProfileDuplicateResponse = {
  id: 2,
  name: 'Alice Bowen',
  slug: 'alice-bowen-2',
  email: 'alice@example.com',
  severity: 'red',
}

const orangeDuplicate: ProfileDuplicateResponse = {
  id: 3,
  name: 'Alice Bowen',
  slug: 'alice-bowen-3',
  email: 'alice.bowen@other.example.com',
  severity: 'orange',
}

const greenDuplicate: ProfileDuplicateResponse = {
  id: 4,
  name: 'Alice B.',
  slug: 'alice-b-4',
  severity: 'green',
}

const allDuplicates: ProfileDuplicateResponse[] = [redDuplicate, orangeDuplicate, greenDuplicate]
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
