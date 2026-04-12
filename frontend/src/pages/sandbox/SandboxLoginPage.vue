<template>
  <DefaultLayout>
    <div class="sandbox">
      <RouterLink to="/sandbox" class="back">← Sandbox</RouterLink>
      <h1>LoginPage</h1>

      <!-- Both cards (magic + Microsoft) -->
      <h2>Cards — magic + Microsoft</h2>
      <div class="task-body">
        <FormCard title="Volunteer Sign In" subtitle="View your volunteer profile, register for sessions, and upload photos.">
          <FormInput v-model="email" type="email" placeholder="your@email.com" autocomplete="email" />
          <FormSubmitRow>
            <FormButton :disabled="!emailValid">Send sign-in link</FormButton>
          </FormSubmitRow>
        </FormCard>
        <FormCard title="DTV Teams Account" subtitle="For dig leads, coordinators and admins — use your @dtv.org.uk Microsoft account.">
          <FormSubmitRow>
            <FormButton color="var(--color-dtv-gold)" href="/auth/login">
              <img src="/icons/microsoft.svg" width="18" height="18" alt="" class="svg-white" />
              Continue with Microsoft
            </FormButton>
          </FormSubmitRow>
        </FormCard>
      </div>

      <!-- Microsoft only (magic disabled) -->
      <h2>Cards — Microsoft only</h2>
      <div class="task-body">
        <FormCard title="DTV Teams Account" subtitle="For dig leads, coordinators and admins — use your @dtv.org.uk Microsoft account.">
          <FormSubmitRow>
            <FormButton color="var(--color-dtv-gold)" href="/auth/login">
              <img src="/icons/microsoft.svg" width="18" height="18" alt="" class="svg-white" />
              Continue with Microsoft
            </FormButton>
          </FormSubmitRow>
        </FormCard>
      </div>

      <!-- Reason banner -->
      <h2>Reason banner — not approved</h2>
      <div class="task-body">
        <AlertBanner message="We don't have an account for jane@example.com. Contact your group organiser to get set up." />
        <FormCard title="Volunteer Sign In" subtitle="View your volunteer profile, register for sessions, and upload photos.">
          <FormInput v-model="emailReason" type="email" placeholder="your@email.com" autocomplete="email" />
          <FormSubmitRow>
            <FormButton :disabled="!emailReasonValid">Send sign-in link</FormButton>
          </FormSubmitRow>
        </FormCard>
        <FormCard title="DTV Teams Account" subtitle="For dig leads, coordinators and admins — use your @dtv.org.uk Microsoft account.">
          <FormSubmitRow>
            <FormButton color="var(--color-dtv-gold)" href="/auth/login">
              <img src="/icons/microsoft.svg" width="18" height="18" alt="" class="svg-white" />
              Continue with Microsoft
            </FormButton>
          </FormSubmitRow>
        </FormCard>
      </div>

      <!-- Reason banner — expired link -->
      <h2>Reason banner — expired link</h2>
      <div class="task-body">
        <AlertBanner message="That sign-in link has expired or is invalid — enter your email below to get a new one." type="info" />
        <FormCard title="Volunteer Sign In" subtitle="View your volunteer profile, register for sessions, and upload photos.">
          <FormInput v-model="emailExpired" type="email" placeholder="your@email.com" autocomplete="email" />
          <FormSubmitRow>
            <FormButton :disabled="!emailExpiredValid">Send sign-in link</FormButton>
          </FormSubmitRow>
        </FormCard>
        <FormCard title="DTV Teams Account" subtitle="For dig leads, coordinators and admins — use your @dtv.org.uk Microsoft account.">
          <FormSubmitRow>
            <FormButton color="var(--color-dtv-gold)" href="/auth/login">
              <img src="/icons/microsoft.svg" width="18" height="18" alt="" class="svg-white" />
              Continue with Microsoft
            </FormButton>
          </FormSubmitRow>
        </FormCard>
      </div>

      <!-- Sending -->
      <h2>Sending…</h2>
      <div class="task-body">
        <FormCard title="Volunteer Sign In" subtitle="View your volunteer profile, register for sessions, and upload photos.">
          <FormInput :model-value="'jane@example.com'" type="email" placeholder="your@email.com" :disabled="true" />
          <FormSubmitRow>
            <FormButton :working="true">Sending…</FormButton>
          </FormSubmitRow>
        </FormCard>
        <FormCard title="DTV Teams Account" subtitle="For dig leads, coordinators and admins — use your @dtv.org.uk Microsoft account.">
          <FormSubmitRow>
            <FormButton color="var(--color-dtv-gold)" href="/auth/login">
              <img src="/icons/microsoft.svg" width="18" height="18" alt="" class="svg-white" />
              Continue with Microsoft
            </FormButton>
          </FormSubmitRow>
        </FormCard>
      </div>

      <!-- Send error -->
      <h2>Send error</h2>
      <div class="task-body">
        <FormCard title="Volunteer Sign In" subtitle="View your volunteer profile, register for sessions, and upload photos.">
          <FormInput v-model="emailError" type="email" placeholder="your@email.com" autocomplete="email" />
          <FormSubmitRow>
            <FormButton :disabled="!emailErrorValid">Send sign-in link</FormButton>
            <p class="form-error">Something went wrong. Please try again.</p>
          </FormSubmitRow>
        </FormCard>
        <FormCard title="DTV Teams Account" subtitle="For dig leads, coordinators and admins — use your @dtv.org.uk Microsoft account.">
          <FormSubmitRow>
            <FormButton color="var(--color-dtv-gold)" href="/auth/login">
              <img src="/icons/microsoft.svg" width="18" height="18" alt="" class="svg-white" />
              Continue with Microsoft
            </FormButton>
          </FormSubmitRow>
        </FormCard>
      </div>

      <!-- Sent confirmation -->
      <h2>Sent confirmation</h2>
      <div class="task-body">
        <FormCard title="Check your email">
          <p class="sent-body">A sign-in link is on its way — click it to continue. The link expires in:</p>
          <div class="sent-countdown">14:35</div>
          <p class="sent-body">Already clicked the link? If you're signed in you can close this tab.</p>
          <FormSubmitRow>
            <button class="form-btn--link">Didn't receive the link? Back to Login</button>
            <p class="sent-contact">Continuing problems? <a href="mailto:admin@deantrailvolunteers.org.uk">Contact us</a></p>
          </FormSubmitRow>
        </FormCard>
      </div>

    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import '../../styles/sandbox.css'
import { ref, computed } from 'vue'
import { usePageTitle } from '../../composables/usePageTitle'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import FormCard from '../../components/forms/FormCard.vue'
import FormInput from '../../components/forms/FormInput.vue'
import FormSubmitRow from '../../components/forms/FormSubmitRow.vue'
import FormButton from '../../components/forms/FormButton.vue'
import AlertBanner from '../../components/forms/AlertBanner.vue'

usePageTitle('Sandbox — LoginPage')

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const email = ref('')
const emailValid = computed(() => emailRegex.test(email.value.trim()))

const emailReason = ref('jane@example.com')
const emailReasonValid = computed(() => emailRegex.test(emailReason.value.trim()))

const emailExpired = ref('')
const emailExpiredValid = computed(() => emailRegex.test(emailExpired.value.trim()))

const emailError = ref('jane@example.com')
const emailErrorValid = computed(() => emailRegex.test(emailError.value.trim()))
</script>

<style scoped>
.task-body {
  max-width: 26rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.form-btn--link {
  background: none;
  border: none;
  color: var(--color-dtv-green-dark);
  font-size: 0.85rem;
  font-weight: 700;
  text-decoration: underline;
  cursor: pointer;
  padding: 0;
  text-align: center;
}

.form-error {
  font-size: 0.875rem;
  color: var(--color-dtv-dirt);
  text-align: center;
  margin: 0;
}

.sent-body {
  font-size: 0.9rem;
  color: var(--color-dtv-dark);
  opacity: 0.7;
  text-align: center;
  margin: 0 0 0.5rem;
  line-height: 1.5;
}

.sent-countdown {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--color-dtv-green);
  letter-spacing: 0.1em;
  text-align: center;
  margin: 0.75rem 0;
}

.sent-contact {
  font-size: 0.8rem;
  color: var(--color-dtv-dark);
  opacity: 0.5;
  text-align: center;
  margin: 0;
}

.sent-contact a {
  color: inherit;
}
</style>
