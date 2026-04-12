<template>
  <TaskLayout>
    <h1 class="sr-only">Collect Consent</h1>

    <div class="consent-stack">

      <!-- Loading -->
      <FormCard v-if="loading" title="Collect Consent">
        <p class="status-text">Loading…</p>
      </FormCard>

      <!-- Error -->
      <AlertBanner v-else-if="loadError" :message="loadError" type="error" />

      <!-- Success -->
      <FormCard v-else-if="submitted" title="Consent recorded">
        <p class="status-text">Consent has been saved for <strong>{{ profileName }}</strong>.</p>
        <FormSubmitRow>
          <FormButton :href="backPath">Back to profile</FormButton>
        </FormSubmitRow>
      </FormCard>

      <!-- Form -->
      <template v-else>
        <FormCard title="Collect Consent" :subtitle="`Collecting consent for ${profileName}`">
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
            <FormButton :disabled="!privacyConsent" :working="submitting" @click="submit">
              {{ submitting ? 'Saving…' : 'Save consent' }}
            </FormButton>
            <p v-if="submitError" class="form-error">{{ submitError }}</p>
          </FormSubmitRow>
        </FormCard>
      </template>

    </div>
  </TaskLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePageTitle } from '../composables/usePageTitle'
import TaskLayout from '../layouts/TaskLayout.vue'
import FormCard from '../components/forms/FormCard.vue'
import FormCheckboxItem from '../components/forms/FormCheckboxItem.vue'
import FormSubmitRow from '../components/forms/FormSubmitRow.vue'
import AlertBanner from '../components/forms/AlertBanner.vue'
import FormButton from '../components/forms/FormButton.vue'
import { profilePath } from '../router/index'

usePageTitle('Collect Consent')

const route = useRoute()
const router = useRouter()

const slug = computed(() => route.params.slug as string)
const backPath = computed(() => profilePath(slug.value))

const profileId = ref<number | null>(null)
const profileName = ref('')
const loading = ref(true)
const loadError = ref('')
const privacyConsent = ref(false)
const photoConsent = ref(false)
const submitting = ref(false)
const submitError = ref('')
const submitted = ref(false)

onMounted(async () => {
  const res = await fetch(`/api/profiles/${slug.value}`)
  if (res.status === 401) { router.push(`/login?returnTo=${encodeURIComponent(route.fullPath)}`); return }
  if (res.status === 403) { loadError.value = 'You do not have permission to collect consent for this profile.'; loading.value = false; return }
  if (!res.ok) { loadError.value = 'Could not load profile. Please try again.'; loading.value = false; return }
  const json = await res.json()
  profileId.value = json.data.id
  profileName.value = json.data.name ?? 'this volunteer'
  loading.value = false
})

async function submit() {
  if (!privacyConsent.value || profileId.value === null) return
  submitting.value = true
  submitError.value = ''
  try {
    const res = await fetch(`/api/profiles/${profileId.value}/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ privacyConsent: privacyConsent.value, photoConsent: photoConsent.value }),
    })
    if (res.status === 401) { router.push(`/login?returnTo=${encodeURIComponent(route.fullPath)}`); return }
    if (!res.ok) { submitError.value = 'Could not save consent. Please try again.'; return }
    submitted.value = true
  } catch {
    submitError.value = 'Network error. Please check your connection and try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.consent-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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
