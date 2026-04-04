<template>
  <DefaultLayout>
    <div class="sandbox">

      <RouterLink to="/sandbox" class="back">← Sandbox</RouterLink>
      <h1>AppButton</h1>

      <h2>Icon Only</h2>
      <div class="row">
        <AppButton label="Edit" icon="edit" mode="icon-only" />
        <AppButton label="Edit" icon="edit" mode="icon-only" :selected="false" />
        <AppButton label="Delete" icon="delete" mode="icon-only" variant="danger" />
        <AppButton label="Edit" icon="edit" mode="icon-only" disabled />
        <AppButton label="Edit" icon="edit" mode="icon-only" working />
      </div>

      <h2>Icon Responsive</h2>
      <div class="row">
        <AppButton label="Edit" icon="edit" mode="icon-responsive" />
        <AppButton label="Edit" icon="edit" mode="icon-responsive" :selected="false" />
        <AppButton label="Delete" icon="delete" mode="icon-responsive" variant="danger" />
        <AppButton label="Edit" icon="edit" mode="icon-responsive" disabled />
        <AppButton label="Edit" icon="edit" mode="icon-responsive" working />
      </div>

      <h2>Icon Text</h2>
      <div class="row">
        <AppButton label="Edit" icon="edit" />
        <AppButton label="Edit" icon="edit" :selected="false" />
        <AppButton label="Delete" icon="delete" variant="danger" />
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

      <h2>Custom Color</h2>
      <div class="row">
        <AppButton label="Info" icon="edit" color="var(--color-dtv-gold)" />
      </div>

    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { usePageTitle } from '../../composables/usePageTitle'
usePageTitle('Sandbox')
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import AppButton from '../../components/AppButton.vue'
</script>

<style scoped>
.sandbox {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.back {
  color: var(--color-dtv-green);
  text-decoration: none;
  font-size: 0.9rem;
}

.back:hover {
  text-decoration: underline;
}

h1 {
  font-size: 1.5rem;
  font-weight: 700;
  border-bottom: 2px solid #ccc;
  padding-bottom: 0.5rem;
  margin-bottom: 0.5rem;
}

h2 {
  font-size: 1rem;
  font-weight: 600;
  color: #666;
  margin-bottom: 0.25rem;
}

.row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 1rem;
}
</style>
