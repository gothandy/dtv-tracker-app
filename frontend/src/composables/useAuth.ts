import { ref, onMounted } from 'vue'

export interface AuthUser {
  displayName: string
  role: 'admin' | 'checkin' | 'readonly' | 'selfservice'
  profileSlug?: string
  profileStats?: {
    sessionsByFY: Record<string, number>
    hoursByFY: Record<string, number>
    isMember: boolean
    cardStatus?: string | null
    regularGroupIds?: number[]
    sessionIds?: number[]
    linkedProfileIds?: number[]
  }
}

const user = ref<AuthUser | null>(null)
const ready = ref(false)

async function fetchMe() {
  try {
    const res = await fetch('/auth/me')
    if (!res.ok) return
    const data = await res.json()
    user.value = data.authenticated ? data.user : null
  } catch {
    user.value = null
  } finally {
    ready.value = true
  }
}

export function useAuth() {
  onMounted(() => {
    if (!ready.value) fetchMe()
  })
  return { user, ready }
}
