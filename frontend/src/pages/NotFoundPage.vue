<template>
  <TaskLayout>
    <FormCard title="Page not found">
      <p class="nf-message">This page doesn't exist.</p>
      <FormSubmitRow>
        <FormButton href="/">Go to home page</FormButton>
        <FormButton v-if="viewer.isPublic" href="/login" variant="outline">Sign in</FormButton>
      </FormSubmitRow>
    </FormCard>
  </TaskLayout>
</template>

<script setup lang="ts">
import TaskLayout from '../layouts/TaskLayout.vue'
import FormCard from '../components/forms/FormCard.vue'
import FormButton from '../components/forms/FormButton.vue'
import FormSubmitRow from '../components/forms/FormSubmitRow.vue'
import { useViewer } from '../composables/useViewer'
import { usePageTitle } from '../composables/usePageTitle'

usePageTitle('Page not found')

const viewer = useViewer()
</script>

<style scoped>
.nf-message {
  font-size: 0.9rem;
  color: var(--color-dtv-dark);
  opacity: 0.7;
  text-align: center;
  margin: 0 0 0.5rem;
}
</style>
