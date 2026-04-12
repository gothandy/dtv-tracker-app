<template>
  <TaskLayout>
    <FormCard title="Access denied">
      <p class="fb-message">
        You don't have permission to view this page.
        <a href="mailto:admin@deantrailvolunteers.org.uk" class="fb-link">Contact us</a>
        if you think this is a mistake.
      </p>
      <FormSubmitRow>
        <FormButton href="/">Go to home page</FormButton>
      </FormSubmitRow>
    </FormCard>
  </TaskLayout>
</template>

<script setup lang="ts">
import TaskLayout from '../layouts/TaskLayout.vue'
import FormCard from '../components/forms/FormCard.vue'
import FormButton from '../components/forms/FormButton.vue'
import FormSubmitRow from '../components/forms/FormSubmitRow.vue'
import { usePageTitle } from '../composables/usePageTitle'

usePageTitle('Access denied')
</script>

<style scoped>
.fb-message {
  font-size: 0.9rem;
  color: var(--color-dtv-dark);
  opacity: 0.7;
  text-align: center;
  margin: 0 0 0.5rem;
  line-height: 1.5;
}

.fb-link {
  color: var(--color-dtv-green-dark);
  opacity: 1;
}
</style>
