<template>
  <DefaultLayout>
    <div class="sandbox">

      <SandboxBackLink />
      <h1>AppButton</h1>

      <h2>Icon Only</h2>
      <div class="row">
        <AppButton label="Edit" icon="edit" mode="icon-only" />
        <AppButton label="Edit" icon="edit" mode="icon-only" :selected="false" />
        <AppButton label="Delete" icon="delete" mode="icon-only" dtv-color="dirt" />
        <AppButton label="Edit" icon="edit" mode="icon-only" disabled />
        <AppButton label="Edit" icon="edit" mode="icon-only" working />
      </div>

      <h2>Icon Responsive</h2>
      <div class="row">
        <AppButton label="Edit" icon="edit" mode="icon-responsive" />
        <AppButton label="Edit" icon="edit" mode="icon-responsive" :selected="false" />
        <AppButton label="Delete" icon="delete" mode="icon-responsive" dtv-color="dirt" />
        <AppButton label="Edit" icon="edit" mode="icon-responsive" disabled />
        <AppButton label="Edit" icon="edit" mode="icon-responsive" working />
      </div>

      <h2>Icon Text</h2>
      <div class="row">
        <AppButton label="Edit" icon="edit" />
        <AppButton label="Edit" icon="edit" :selected="false" />
        <AppButton label="Delete" icon="delete" dtv-color="dirt" />
        <AppButton label="Edit" icon="edit" disabled />
        <AppButton label="Edit" icon="edit" working />
      </div>

      <h2>Text Only</h2>
      <div class="row">
        <AppButton label="Submit" />
        <AppButton label="Submit" :selected="false" />
        <AppButton label="Submit" disabled />
        <AppButton label="Submit" working />
      </div>

      <h2>Link (href)</h2>
      <div class="row">
        <AppButton label="External Link" href="https://example.com" target="_blank" />
        <AppButton label="Download" icon="edit" href="/api/sessions/export" />
        <AppButton label="View on Eventbrite" icon="brands/eventbrite" mode="icon-only" href="https://www.eventbrite.co.uk" target="_blank" />
      </div>

      <h2>Custom Color</h2>
      <div class="row">
        <AppButton label="Gold" icon="edit" dtv-color="gold" />
      </div>

      <h2>Full Width</h2>
      <AppButton label="Submit" icon="edit" style="width: 100%" />
      <AppButton label="Submit" icon="edit" mode="icon-responsive" style="width: 100%" />
      <AppButton label="Submit" style="width: 100%" />
      <AppButton label="This is a very long button label that should be truncated with an ellipsis" icon="edit" style="width: 100%" />

    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import '../../styles/sandbox.css'
import { usePageTitle } from '../../composables/usePageTitle'
usePageTitle('Sandbox')
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import SandboxBackLink from './SandboxBackLink.vue'
import AppButton from '../../components/AppButton.vue'
</script>

<style scoped>
.sandbox { gap: 1rem; }

.row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 1rem;
}
</style>
