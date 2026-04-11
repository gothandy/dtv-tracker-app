import { ref } from 'vue'

// Module-level state — single InfoBar shared across the whole app
const pending = ref<string | null>(null)

export function useInfoBar() {
  function show(key: string) { pending.value = key }
  function clear()           { pending.value = null }
  return { pending, show, clear }
}
