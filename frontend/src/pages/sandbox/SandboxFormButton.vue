<template>
  <DefaultLayout>
    <div class="sandbox">

      <SandboxBackLink />
      <h1>FormButton</h1>

      <h2>Default (green)</h2>
      <div class="col">
        <FormButton>Submit</FormButton>
        <FormButton href="/sandbox">Link button</FormButton>
      </div>

      <h2>With icon</h2>
      <div class="col">
        <FormButton>
          <img src="/icons/brands/microsoft.svg" width="18" height="18" alt="" class="svg-white" />
          Log in with Microsoft
        </FormButton>
      </div>

      <h2>Outline</h2>
      <div class="col">
        <FormButton variant="outline" href="/sandbox">Back</FormButton>
      </div>

      <h2>Disabled</h2>
      <div class="col">
        <FormButton :disabled="true">Submit</FormButton>
        <FormButton variant="outline" :disabled="true">Back</FormButton>
      </div>

      <h2>Working</h2>
      <div class="col">
        <FormButton :working="true">Saving…</FormButton>
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
import FormButton from '../../components/forms/FormButton.vue'
</script>

<style scoped>
.sandbox { gap: 1rem; }

.col {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 24rem;
  margin-bottom: 1rem;
}
</style>
