<template>
  <DefaultLayout>
    <div class="sandbox">

      <SandboxBackLink />
      <h1>AppButton</h1>

      <!-- ── Action usage (default) ── -->

      <h2>Icon Only</h2>
      <div class="row">
        <AppButton label="Edit" icon="edit" mode="icon-only" />
        <AppButton label="Edit" icon="edit" mode="icon-only" variant="subtle" />
        <AppButton label="Delete" icon="delete" mode="icon-only" variant="danger" />
        <AppButton label="Edit" icon="edit" mode="icon-only" disabled />
        <AppButton label="Edit" icon="edit" mode="icon-only" working />
      </div>

      <h2>Icon Responsive</h2>
      <div class="row">
        <AppButton label="Edit" icon="edit" mode="icon-responsive" />
        <AppButton label="Edit" icon="edit" mode="icon-responsive" variant="subtle" />
        <AppButton label="Delete" icon="delete" mode="icon-responsive" variant="danger" />
        <AppButton label="Edit" icon="edit" mode="icon-responsive" disabled />
        <AppButton label="Edit" icon="edit" mode="icon-responsive" working />
      </div>

      <h2>Icon Text</h2>
      <div class="row">
        <AppButton label="Edit" icon="edit" />
        <AppButton label="Edit" icon="edit" variant="subtle" />
        <AppButton label="Delete" icon="delete" variant="danger" />
        <AppButton label="Edit" icon="edit" disabled />
        <AppButton label="Edit" icon="edit" working />
      </div>

      <h2>Text Only</h2>
      <div class="row">
        <AppButton label="Submit" />
        <AppButton label="Submit" variant="subtle" />
        <AppButton label="Submit" disabled />
        <AppButton label="Submit" working />
      </div>

      <h2>Variants</h2>
      <div class="row">
        <AppButton label="Primary" icon="edit" variant="primary" />
        <AppButton label="Secondary" icon="edit" variant="secondary" />
        <AppButton label="Danger" icon="delete" variant="danger" />
        <AppButton label="Subtle" icon="edit" variant="subtle" />
      </div>

      <h2>Link (href — external only)</h2>
      <div class="row">
        <AppButton label="External Link" href="https://example.com" target="_blank" />
        <AppButton label="Download" icon="edit" href="/api/sessions/export" />
        <AppButton label="View on Eventbrite" icon="brands/eventbrite" mode="icon-only" href="https://www.eventbrite.co.uk" target="_blank" />
      </div>

      <h2>Full Width</h2>
      <AppButton label="Submit" icon="edit" style="width: 100%" />
      <AppButton label="Submit" icon="edit" mode="icon-responsive" style="width: 100%" />
      <AppButton label="Submit" style="width: 100%" />
      <AppButton label="This is a very long button label that should be truncated with an ellipsis" icon="edit" style="width: 100%" />

      <!-- ── Task usage ── -->

      <h2>Task — Variants</h2>
      <div class="col">
        <AppButton usage="task" label="Primary (green)" variant="primary" />
        <AppButton usage="task" label="Secondary (gold)" variant="secondary" />
        <AppButton usage="task" label="Danger (dirt)" variant="danger" />
        <AppButton usage="task" label="Subtle (sand)" variant="subtle" />
      </div>

      <h2>Task — With icon</h2>
      <div class="col">
        <AppButton usage="task" label="Send log-in email" icon="tick" />
        <AppButton usage="task" variant="secondary" label="Log-in with Microsoft" icon="brands/microsoft" />
      </div>

      <h2>Task — States</h2>
      <div class="col">
        <AppButton usage="task" label="Disabled" :disabled="true" />
        <AppButton usage="task" label="Working…" :working="true" />
        <AppButton usage="task" label="Back to sessions" variant="subtle" />
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

.col {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 24rem;
  margin-bottom: 1rem;
}
</style>
