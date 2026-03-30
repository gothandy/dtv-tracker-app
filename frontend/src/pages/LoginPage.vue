<template>
  <DefaultLayout>
    <div class="flex flex-col items-center">

      <!-- Reason banner -->
      <div v-if="reasonMessage" class="w-full max-w-sm mb-4 p-4 pl-10 border-2 border-amber-400 bg-amber-50 text-amber-900 text-base font-medium leading-relaxed relative">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xl">⚠</span>
        {{ reasonMessage }}
      </div>

      <!-- Login cards -->
      <template v-if="!sent">

        <div class="grid grid-cols-1 gap-4 w-full max-w-sm">

          <!-- Volunteer sign-in (magic link) -->
          <div v-if="magicEnabled" class="bg-gray-50 p-6 border border-gray-200 text-center">
            <h2 class="text-lg font-bold text-black mb-1">Volunteer Sign In</h2>
            <p class="text-base text-gray-500 mb-4 leading-snug">View your volunteer profile, register for sessions, and upload photos.</p>
            <input
              v-model="email"
              type="email"
              placeholder="your@email.com"
              autocomplete="email"
              :disabled="sending"
              @keydown.enter="sendMagicLink"
              class="block w-full px-3 py-3 mb-2 border-2 border-gray-300 text-black bg-white text-base focus:outline-none focus:border-dtv-green disabled:opacity-50 text-left"
            />
            <button
              @click="sendMagicLink"
              :disabled="sending"
              class="inline-block px-6 py-3 bg-dtv-green text-white font-bold text-base uppercase tracking-wide hover:opacity-90 disabled:opacity-50 cursor-pointer disabled:cursor-default"
            >
              {{ sending ? 'Sending…' : 'Send sign-in link' }}
            </button>
            <p v-if="magicError" class="mt-2 text-base text-red-700">{{ magicError }}</p>
          </div>

          <!-- DTV Teams account (Microsoft) -->
          <div class="bg-gray-50 p-6 border border-gray-200 text-center">
            <h2 class="text-lg font-bold text-black mb-1">DTV Teams Account</h2>
            <p class="text-base text-gray-500 mb-4 leading-snug">For dig leads, coordinators and admins — use your <strong>@dtv.org.uk</strong> Microsoft account.</p>
            <a :href="microsoftHref" class="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-gray-300 bg-white text-black text-base hover:border-gray-400 transition-colors no-underline">
              <img src="/svg/microsoft.svg" width="18" height="18" alt="" />
              Continue with Microsoft
            </a>
          </div>

        </div>

      </template>

      <!-- Sent confirmation -->
      <div v-else class="bg-gray-50 p-6 border border-gray-200 text-center">
        <h2 class="text-lg font-bold text-black mb-3">Check your email</h2>
        <p class="text-base text-gray-500 mb-2 leading-relaxed">A sign-in link is on its way — click it to continue. The link expires in:</p>
        <div class="text-4xl font-bold text-dtv-green tracking-wider my-4">{{ countdown }}</div>
        <p class="text-base text-gray-500 mb-4 leading-relaxed">Already clicked the link? If you're signed in you can close this tab.</p>
        <button @click="backToLogin" class="text-dtv-green text-sm font-bold underline cursor-pointer">
          Didn't receive the link? Back to Login
        </button>
        <p class="text-sm text-gray-400 mt-4">Continuing problems? <a href="mailto:admin@deantrailvolunteers.org.uk" class="text-gray-400">Contact us</a></p>
      </div>

    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import DefaultLayout from '../layouts/DefaultLayout.vue'

const route = useRoute()
const email = ref('')
const sending = ref(false)
const magicError = ref('')
const sent = ref(false)
const magicEnabled = ref(false)
const reasonMessage = ref('')
const countdownSeconds = ref(0)
let countdownTimer: ReturnType<typeof setInterval> | null = null

const returnTo = computed(() => {
  const r = route.query.returnTo as string | undefined
  return r?.startsWith('/') ? r : undefined
})

const microsoftHref = computed(() =>
  returnTo.value ? `/auth/login?returnTo=${encodeURIComponent(returnTo.value)}` : '/auth/login'
)

const countdown = computed(() => {
  const m = Math.floor(countdownSeconds.value / 60)
  const s = countdownSeconds.value % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
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
      sent.value = true
      startCountdown(15 * 60)
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
})
</script>
