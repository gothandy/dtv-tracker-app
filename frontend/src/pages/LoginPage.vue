<template>
  <!-- Magic link sent — stripped-back page, no header/footer, nothing else to click -->
  <div v-if="method === 'link' && sent && !expired" class="close-tab-page">
    <div class="close-tab-card">
      <p class="close-tab-body">DTV Tracker sent you a log-in link. This link expires at:</p>
      <div class="close-tab-code">{{ expiryTime }}</div>
      <p class="close-tab-body">You can close this window and return to your original tab.</p>
    </div>
  </div>

  <!-- All other states in the normal layout -->
  <TaskLayout v-else>
    <h1 class="sr-only">Login</h1>

    <div class="login-stack">

      <!-- Reason banner -->
      <AlertBanner v-if="reasonMessage" :message="reasonMessage" />

      <!-- Login cards -->
      <template v-if="!sent">

        <!-- Volunteer sign-in (magic link / verification code) -->
        <FormCard
          v-if="magicEnabled || verifyEnabled"
          title="Your email log-in"
          subtitle="View your volunteer profile, manage your sessions, and upload photos."
        >
          <!-- Method selector — only shown when both options are available -->
          <p v-if="magicEnabled && verifyEnabled" class="method-prompt">Choose how we verify your email.</p>
          <div v-if="magicEnabled && verifyEnabled" class="method-selector">
            <label class="method-option">
              <input type="radio" v-model="method" value="link" class="method-radio" />
              <span>Click a link</span>
            </label>
            <label class="method-option">
              <input type="radio" v-model="method" value="code" class="method-radio" />
              <span>Enter a code</span>
            </label>
          </div>

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
              :label="sending ? 'Sending…' : 'Send log-in email'"
              :disabled="!emailValid || sending"
              :working="sending"
              @click="sendLoginEmail"
            />
            <p v-if="magicError" class="form-error">{{ magicError }}</p>
          </FormSubmitRow>
        </FormCard>

        <!-- DTV Teams account (Microsoft) -->
        <FormCard
          title="DTV Teams Only"
          subtitle="For dig leads, coordinators and admins — you must use your @dtv.org.uk account."
        >
          <FormSubmitRow>
            <AppButton usage="task" variant="secondary" icon="brands/microsoft" label="Log-in with Microsoft" :href="microsoftHref" />
          </FormSubmitRow>
        </FormCard>

      </template>

      <!-- Expired -->
      <FormCard v-else-if="expired" title="This log-in link has expired">
        <p class="sent-body">Click below to send a new log-in email.</p>
        <FormSubmitRow>
          <AppButton usage="task" label="Send a new log-in email" :working="sending" @click="sendLoginEmail" />
        </FormSubmitRow>
      </FormCard>

      <!-- Verification code entry (method === 'code' && sent && !expired) -->
      <FormCard v-else title="Enter your verification code">
        <p class="sent-body">We've sent a verification code to your email. Enter it below — it expires in {{ countdown }}.</p>
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

usePageTitle('Login')

const route = useRoute()
const email = ref('')
const sending = ref(false)
const magicError = ref('')
const sent = ref(false)
const method = ref<'link' | 'code'>('link')
const magicEnabled = ref(false)
const verifyEnabled = ref(false)
const reasonMessage = ref('')
const countdownSeconds = ref(0)
const expiryTime = ref('')
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

const expired = computed(() => sent.value && countdownSeconds.value <= 0)

const countdown = computed(() => {
  const mins = Math.ceil(countdownSeconds.value / 60)
  return mins === 1 ? '1 minute' : `${mins} minutes`
})

const reasons: Record<string, (email?: string) => string> = {
  'not-approved': (e) => `We don't have an account for ${e ?? 'that email address'}. Contact your group organiser to get set up.`,
  'not-found':    (e) => `We don't have an account for ${e ?? 'that email address'}. Contact your group organiser to get set up.`,
  'invalid-state': () => 'That sign-in link has expired or is invalid — enter your email below to get a new one.',
}

async function sendLoginEmail() {
  if (!email.value.trim()) return
  sending.value = true
  magicError.value = ''

  const endpoint = method.value === 'code' ? '/auth/verify/send' : '/auth/magic/send'

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination: email.value.trim(), returnTo: returnTo.value }),
    })
    if (res.ok) {
      if (method.value === 'link') {
        const data = await res.json()
        expiryTime.value = data.expiresAt ?? ''
      }
      sent.value = true
      startCountdown(15 * 60)
    } else if (res.status === 429) {
      const data = await res.json().catch(() => ({}))
      magicError.value = data.error || 'Too many attempts — please try again later.'
    } else {
      const data = await res.json().catch(() => ({}))
      magicError.value = data.error || 'Something went wrong. Please try again.'
    }
  } catch {
    magicError.value = 'Could not send email. Please check your connection and try again.'
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
    magicEnabled.value = !!p.magic
    verifyEnabled.value = !!p.verify
  }).catch(() => {})

  const reason = route.query.reason as string | undefined
  if (reason && reasons[reason]) {
    const reasonEmail = route.query.email as string | undefined
    reasonMessage.value = reasons[reason](reasonEmail)
  }

  // Pre-fill from verification code email button (?method=code&email=...&code=...)
  const methodParam = route.query.method as string | undefined
  const prefillCode = route.query.code as string | undefined
  const prefillEmail = route.query.email as string | undefined
  if (methodParam === 'code' && prefillCode && prefillEmail) {
    method.value = 'code'
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
/* Close-tab page — full screen, no app chrome */
.close-tab-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  padding: 1rem;
  box-sizing: border-box;
}

.close-tab-card {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  max-width: 360px;
  width: 100%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.close-tab-body {
  color: #555;
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0 0 0.5rem;
}

.close-tab-code {
  font-size: 3rem;
  font-weight: 700;
  color: var(--color-dtv-green);
  letter-spacing: 0.15em;
  margin: 0.75rem 0;
}

/* Login stack */
.login-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.method-prompt {
  font-size: 0.9rem;
  color: var(--color-dtv-dark);
  margin: 0 0 0.5rem;
}

.method-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.method-option {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.9rem;
  color: var(--color-dtv-dark);
  cursor: pointer;
}

.method-radio {
  accent-color: var(--color-dtv-green);
  width: 1.1rem;
  height: 1.1rem;
  cursor: pointer;
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
