import { ref } from 'vue'

const active = ref<string | null>(null)
const name   = ref('')
const email  = ref('')

export function useFlash() {
  function show(key: string, params: Record<string, string> = {}) {
    active.value = key
    name.value   = params.name  ?? ''
    email.value  = params.email ?? ''
  }
  function dismiss() {
    active.value = null
    name.value   = ''
    email.value  = ''
  }
  return { active, name, email, show, dismiss }
}
