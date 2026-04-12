<template>
  <TaskLayout>
    <h1 class="sr-only">Login</h1>

    <div class="login-stack">

      <!-- Reason banner -->
      <AlertBanner v-if="reasonMessage" :message="reasonMessage" />

      <!-- Login cards -->
      <template v-if="!sent">

        <!-- Volunteer sign-in (magic link) -->
        <FormCard
          v-if="magicEnabled"
          title="Self-service log-in"
          subtitle="View your volunteer profile, manage your sessions, and upload photos."
        >
          <FormInput
            v-model="email"
            type="email"
            placeholder="your@email.com"
            autocomplete="email"
            :disabled="sending"
            @enter="sendMagicLink"
          />
          <FormSubmitRow>
            <FormButton :disabled="!emailValid || sending" :working="sending" @click="sendMagicLink">
              {{ sending ? 'Sending…' : 'Send log-in email' }}
            </FormButton>
            <p v-if="magicError" class="form-error">{{ magicError }}</p>
          </FormSubmitRow>
        </FormCard>

        <!-- DTV Teams account (Microsoft) -->
        <FormCard
          title="DTV Teams Account"
          subtitle="For dig leads, coordinators and admins — use your @dtv.org.uk Microsoft account."
        >
          <FormSubmitRow>
            <FormButton color="var(--color-dtv-gold)" :href="microsoftHref">
              <img src="/icons/brands/microsoft.svg" width="18" height="18" alt="" class="svg-white" />
              Continue with Microsoft
            </FormButton>
          </FormSubmitRow>
        </FormCard>

      </template>

      <!-- Expired -->
      <FormCard v-else-if="expired" title="This log-in link has expired">
        <p class="sent-body">Click below to send a new log-in email.</p>
        <FormSubmitRow>
          <FormButton :working="sending" @click="sendMagicLink">Send a new log-in email</FormButton>
        </FormSubmitRow>
      </FormCard>

      <!-- Sent confirmation -->
      <FormCard v-else title="Check your email">
        <p class="sent-body">We've sent you a log-in link and a confirmation code.</p>
        <div class="sent-code">{{ confirmCode }}</div>
        <p class="sent-body sent-expiry">This link expires in {{ countdown }}.</p>
        <p class="sent-body">Already clicked the link? You can close this tab if you are now logged in.</p>
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
import FormButton from '../components/forms/FormButton.vue'

usePageTitle('Login')

const route = useRoute()
const email = ref('')
const sending = ref(false)
const magicError = ref('')
const sent = ref(false)
const magicEnabled = ref(false)
const reasonMessage = ref('')
const countdownSeconds = ref(0)
const confirmCode = ref('')
let countdownTimer: ReturnType<typeof setInterval> | null = null

const returnTo = computed(() => {
  const r = route.query.returnTo as string | undefined
  return r?.startsWith('/') ? r : undefined
})

let broadcastChannel: BroadcastChannel | null = null
let hasHandledAuthSuccess = false

function closeBroadcastChannel() {
  broadcastChannel?.close()
  broadcastChannel = null
}

function openBroadcastChannel() {
  closeBroadcastChannel()
  if (typeof BroadcastChannel === 'undefined') return

  broadcastChannel = new BroadcastChannel('dtv-auth')
  broadcastChannel.onmessage = (e) => {
    if (hasHandledAuthSuccess) return
    if (e.data?.type !== 'auth-success') return

    hasHandledAuthSuccess = true
    closeBroadcastChannel()

    const flashName = typeof e.data?.flashName === 'string' ? e.data.flashName : ''
    const dest = returnTo.value || '/'
    let destWithNotice = dest.includes('?') ? `${dest}&flashKey=signed-in` : `${dest}?flashKey=signed-in`
    if (flashName) destWithNotice += `&flashName=${encodeURIComponent(flashName)}`

    window.location.href = destWithNotice
  }
}

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

async function sendMagicLink() {
  if (!email.value.trim()) return
  sending.value = true
  magicError.value = ''
  try {
    const res = await fetch('/auth/magic/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination: email.value.trim(), returnTo: returnTo.value }),
    })
    if (res.ok) {
      const data = await res.json()
      confirmCode.value = data.code ?? ''
      sent.value = true
      startCountdown(15 * 60)
      openBroadcastChannel()
    } else if (res.status === 429) {
      magicError.value = 'Too many attempts — please try again later.'
    } else {
      magicError.value = 'Something went wrong. Please try again.'
    }
  } catch {
    magicError.value = 'Could not send email. Please check your connection and try again.'
  } finally {
    sending.value = false
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
  if (countdownTimer) clearInterval(countdownTimer)
  closeBroadcastChannel()
}

onMounted(async () => {
  fetch('/auth/providers').then(r => r.json()).then(p => { magicEnabled.value = !!p.magic }).catch(() => {})

  const reason = route.query.reason as string | undefined
  if (reason && reasons[reason]) {
    const emailParam = route.query.email as string | undefined
    reasonMessage.value = reasons[reason](emailParam)
  }
})

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
  closeBroadcastChannel()
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

.sent-code {
  font-size: 3rem;
  font-weight: 700;
  color: var(--color-dtv-green);
  letter-spacing: 0.15em;
  text-align: center;
  margin: 0.75rem 0;
}

.sent-expiry {
  font-size: 0.8rem;
  opacity: 0.5;
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
