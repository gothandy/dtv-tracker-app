<template>
  <DefaultLayout>
    <div class="sandbox">
      <SandboxBackLink />
      <h1>ProfileWarnings</h1>
      <p class="sandbox-warning">Static mocked data — no API calls.</p>

      <h2>Single warning</h2>
      <div class="demo">
        <ProfileWarnings :warnings="[{ text: 'Possible Duplicate', url: '/profiles?fy=all&search=Charlotte+O%27Hara' }]" />
      </div>

      <h2>Multiple warnings</h2>
      <div class="demo">
        <ProfileWarnings :warnings="[{ text: 'Possible Duplicate', url: '/profiles?fy=all&search=Charlotte+O%27Hara' }, { text: 'Child No Adult', url: '/entries?q=%23child&fy=all&accompanyingAdult=empty&profileId=641' }]" />
      </div>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import '../../styles/sandbox.css'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import SandboxBackLink from './SandboxBackLink.vue'
import ProfileWarnings from '../../components/profiles/ProfileWarnings.vue'
import { usePageTitle } from '../../composables/usePageTitle'

usePageTitle('Sandbox')
</script>
