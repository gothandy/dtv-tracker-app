<template>
  <DefaultLayout>
    <div class="sandbox">
      <RouterLink to="/sandbox" class="back">← Sandbox</RouterLink>
      <h1>ConsentPage</h1>

      <!-- Loading -->
      <h2>Loading</h2>
      <div class="task-body">
        <FormCard title="Collect Consent">
          <p class="status-text">Loading…</p>
        </FormCard>
      </div>

      <!-- Error -->
      <h2>Load error</h2>
      <div class="task-body">
        <AlertBanner message="You do not have permission to collect consent for this profile." type="error" />
      </div>

      <!-- Form -->
      <h2>Form</h2>
      <div class="task-body">
        <FormCard title="Collect Consent" subtitle="Collecting consent for Jane Smith">
          <FormCheckboxItem
            v-model="privacyConsent"
            label="I agree to my personal data being stored and used for volunteer coordination."
            description="This includes your name, email address, and session attendance records."
            :required="true"
          />
          <FormCheckboxItem
            v-model="photoConsent"
            label="I agree to photos and videos of me being used in DTV communications."
            description="Photos may appear on social media, newsletters, and the DTV website."
          />
          <a href="/privacy" target="_blank" class="privacy-link">Read our privacy policy</a>
          <FormSubmitRow>
            <FormButton :disabled="!privacyConsent">Save consent</FormButton>
          </FormSubmitRow>
        </FormCard>
      </div>

      <!-- Working -->
      <h2>Saving…</h2>
      <div class="task-body">
        <FormCard title="Collect Consent" subtitle="Collecting consent for Jane Smith">
          <FormCheckboxItem
            :model-value="true"
            label="I agree to my personal data being stored and used for volunteer coordination."
            description="This includes your name, email address, and session attendance records."
            :required="true"
          />
          <FormCheckboxItem
            :model-value="false"
            label="I agree to photos and videos of me being used in DTV communications."
            description="Photos may appear on social media, newsletters, and the DTV website."
          />
          <a href="/privacy" target="_blank" class="privacy-link">Read our privacy policy</a>
          <FormSubmitRow>
            <FormButton :working="true">Saving…</FormButton>
          </FormSubmitRow>
        </FormCard>
      </div>

      <!-- Submit error -->
      <h2>Submit error</h2>
      <div class="task-body">
        <FormCard title="Collect Consent" subtitle="Collecting consent for Jane Smith">
          <FormCheckboxItem
            :model-value="true"
            label="I agree to my personal data being stored and used for volunteer coordination."
            description="This includes your name, email address, and session attendance records."
            :required="true"
          />
          <FormCheckboxItem
            :model-value="false"
            label="I agree to photos and videos of me being used in DTV communications."
            description="Photos may appear on social media, newsletters, and the DTV website."
          />
          <a href="/privacy" target="_blank" class="privacy-link">Read our privacy policy</a>
          <FormSubmitRow>
            <FormButton>Save consent</FormButton>
            <p class="form-error">Could not save consent. Please try again.</p>
          </FormSubmitRow>
        </FormCard>
      </div>

      <!-- Success -->
      <h2>Success</h2>
      <div class="task-body">
        <FormCard title="Consent recorded">
          <p class="status-text">Consent has been saved for <strong>Jane Smith</strong>.</p>
          <FormSubmitRow>
            <FormButton href="/profiles/jane-smith-1">Back to profile</FormButton>
          </FormSubmitRow>
        </FormCard>
      </div>

    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import '../../styles/sandbox.css'
import { ref } from 'vue'
import { usePageTitle } from '../../composables/usePageTitle'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import FormCard from '../../components/forms/FormCard.vue'
import FormCheckboxItem from '../../components/forms/FormCheckboxItem.vue'
import FormSubmitRow from '../../components/forms/FormSubmitRow.vue'
import FormButton from '../../components/forms/FormButton.vue'
import AlertBanner from '../../components/forms/AlertBanner.vue'

usePageTitle('Sandbox — ConsentPage')

const privacyConsent = ref(false)
const photoConsent = ref(false)
</script>

<style scoped>
.task-body {
  max-width: 26rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.status-text {
  font-size: 0.9rem;
  color: var(--color-dtv-dark);
  opacity: 0.7;
  margin: 0;
  text-align: center;
  line-height: 1.5;
}

.status-text strong {
  opacity: 1;
  font-weight: 700;
}

.privacy-link {
  display: block;
  margin-top: 0.75rem;
  font-size: 0.85rem;
  color: var(--color-dtv-green-dark);
}

.form-error {
  font-size: 0.875rem;
  color: var(--color-dtv-dirt);
  text-align: center;
  margin: 0;
}
</style>
