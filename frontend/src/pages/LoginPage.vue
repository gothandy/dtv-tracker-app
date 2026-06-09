<template>
  <TaskLayout>
    <h1 class="sr-only">Login</h1>

    <div class="login-stack">

      <AlertBanner
        v-if="reasonMessage"
        :message="reasonMessage"
        :type="loginReasonBannerType"
      />

      <template v-if="!sent">

        <FormCard
          v-if="selfServiceEnabled"
          :title="ACCESS_LABEL_SELF_SERVICE"
          subtitle="Sign in with email to view your volunteer profile, manage your sessions, and upload photos."
        >
          <FormInput
            v-model="email"
            type="email"
            placeholder="your@email.com"
            autocomplete="email"
            :disabled="sending"
            @enter="sendLoginEmail"
          />
          <FormSubmitRow>
            <AppButton
              usage="task"
              :icon="sending ? undefined : 'tick'"
              :label="sending ? 'Sending...' : 'Send verification code'"
              :disabled="!emailValid || sending"
              :working="sending"
              @click="sendLoginEmail"
            />
            <p v-if="loginError" class="form-error">{{ loginError }}</p>
          </FormSubmitRow>
        </FormCard>

        <FormCard
          :title="ACCESS_LABEL_CHECK_IN"
          subtitle="Sign in with your Microsoft account, using an address ending @dtv.org.uk"
        >
          <FormSubmitRow>
            <AppButton usage="task" variant="secondary" icon="brands/microsoft" label="Log-in with Microsoft" :href="microsoftHref" />
          </FormSubmitRow>
        </FormCard>

      </template>

      <FormCard v-else-if="expired" title="Your verification code has expired">
        <p class="sent-body">Click below to send a new verification code.</p>
        <FormSubmitRow>
          <AppButton usage="task" label="Send a new verification code" :working="sending" @click="sendLoginEmail" />
        </FormSubmitRow>
      </FormCard>

      <FormCard v-else title="Enter your verification code">
        <p class="sent-body">We've sent a verification code to your email. Enter it below - it expires in {{ countdown }}.</p>
        <FormInput
          v-model="verifyInput"
          type="text"
          placeholder="1234"
          autocomplete="one-time-code"
          inputmode="numeric"
          :disabled="verifying"
          @enter="checkCode"
        />
        <FormSubmitRow>
          <AppButton usage="task" label="Verify code" :disabled="!verifyInput.trim() || verifying" :working="verifying" @click="checkCode" />
          <p v-if="verifyError" class="form-error">{{ verifyError }}</p>
        </FormSubmitRow>
        <FormSubmitRow>
          <button class="form-btn--link" @click="backToLogin">
            Didn't receive the email? Back to log-in
          </button>
          <p class="sent-contact">Continuing problems? <a href="mailto:admin@deantrailvolunteers.org.uk">Contact us</a></p>
        </FormSubmitRow>
      </FormCard>

    </div>
  </TaskLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { usePageTitle } from '../composables/usePageTitle'
import TaskLayout from '../layouts/TaskLayout.vue'
import AlertBanner from '../components/forms/AlertBanner.vue'
import FormCard from '../components/forms/FormCard.vue'
import FormInput from '../components/forms/FormInput.vue'
import FormSubmitRow from '../components/forms/FormSubmitRow.vue'
import AppButton from '../components/AppButton.vue'
import { ACCESS_LABEL_CHECK_IN, ACCESS_LABEL_SELF_SERVICE } from '../utils/accessLabels'

usePageTitle('Login')

const route = useRoute()
const email = ref('')
const sending = ref(false)
const loginError = ref('')
const sent = ref(false)
const selfServiceEnabled = ref(false)
const reasonMessage = ref('')
const countdownSeconds = ref(0)
const verifyInput = ref('')
const verifyError = ref('')
const verifying = ref(false)
let countdownTimer: ReturnType<typeof setInterval> | null = null

const returnTo = computed(() => {
  const r = route.query.returnTo as string | undefined
  return r?.startsWith('/') ? r : undefined
})

const emailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()))

const microsoftHref = computed(() =>
  returnTo.value ? `/auth/login?returnTo=${encodeURIComponent(returnTo.value)}` : '/auth/login'
)

const loginReasonBannerType = computed<'warning' | 'error'>(() =>
  route.query.reason === 'dtv-not-authorised' ? 'error' : 'warning'
)

const expired = computed(() => sent.value && countdownSeconds.value <= 0)

const countdown = computed(() => {
  const mins = Math.ceil(countdownSeconds.value / 60)
  return mins === 1 ? '1 minute' : `${mins} minutes`
})

const reasons: Record<string, (email?: string) => string> = {
  'not-approved': (e) => `We don't have an account for ${e ?? 'that email address'}. Contact your group organiser to get set up.`,
  'not-found':    (e) => `We don't have an account for ${e ?? 'that email address'}. Contact your group organiser to get set up.`,
  'dtv-not-authorised': () =>
    `Access denied. Your Microsoft account is not set up for ${ACCESS_LABEL_CHECK_IN}. Please contact your admin.`,
  'session-expired': () =>
    'Your sign-in has expired. Sign in again to continue - you will return to this page afterwards.',
}

async function sendLoginEmail() {
  if (!email.value.trim()) return
  sending.value = true
  loginError.value = ''

  try {
    const res = await fetch('/auth/verify/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination: email.value.trim(), returnTo: returnTo.value }),
    })
    if (res.ok) {
      sent.value = true
      startCountdown(15 * 60)
    } else if (res.status === 429) {
      const data = await res.json().catch(() => ({}))
      loginError.value = data.error || 'Too many attempts - please try again later.'
    } else {
      const data = await res.json().catch(() => ({}))
      loginError.value = data.error || 'Something went wrong. Please try again.'
    }
  } catch {
    loginError.value = 'Could not send email. Please check your connection and try again.'
  } finally {
    sending.value = false
  }
}

async function checkCode() {
  if (!verifyInput.value.trim()) return
  verifying.value = true
  verifyError.value = ''

  try {
    const res = await fetch('/auth/verify/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value.trim(), code: verifyInput.value.trim() }),
    })
    if (res.ok) {
      const data = await res.json()
      const flashName = data.flashName ?? ''
      const dest = returnTo.value || '/'
      let destWithFlash = dest.includes('?') ? `${dest}&flashKey=signed-in` : `${dest}?flashKey=signed-in`
      if (flashName) destWithFlash += `&flashName=${encodeURIComponent(flashName)}`
      window.location.href = destWithFlash
    } else {
      const data = await res.json().catch(() => ({}))
      verifyError.value = data.error || 'Verification failed. Please try again.'
    }
  } catch {
    verifyError.value = 'Could not verify code. Please check your connection and try again.'
  } finally {
    verifying.value = false
  }
}

function startCountdown(seconds: number) {
  if (countdownTimer) clearInterval(countdownTimer)
  countdownSeconds.value = seconds
  countdownTimer = setInterval(() => {
    if (countdownSeconds.value <= 0) { clearInterval(countdownTimer!); return }
    countdownSeconds.value--
  }, 1000)
}

function backToLogin() {
  sent.value = false
  verifyInput.value = ''
  verifyError.value = ''
  if (countdownTimer) clearInterval(countdownTimer)
}

onMounted(async () => {
  fetch('/auth/providers').then(r => r.json()).then(p => {
    selfServiceEnabled.value = !!p.selfService
  }).catch(() => {})

  const reason = route.query.reason as string | undefined
  if (reason && reasons[reason]) {
    const reasonEmail = route.query.email as string | undefined
    reasonMessage.value = reasons[reason](reasonEmail)
  }

  const prefillCode = route.query.code as string | undefined
  const prefillEmail = route.query.email as string | undefined
  if (prefillCode && prefillEmail) {
    email.value = prefillEmail
    verifyInput.value = prefillCode
    sent.value = true
    startCountdown(15 * 60)
  }
})

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>

<style scoped>
.login-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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
