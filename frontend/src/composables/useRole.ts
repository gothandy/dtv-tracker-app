import { computed } from 'vue'
import { useAuth } from './useAuth'

export function useRole() {
  const { user, ready } = useAuth()

  const role = computed(() => user.value?.role ?? null)

  const isAdmin = computed(() => role.value === 'admin')
  const isCheckIn = computed(() => role.value === 'checkin')
  const isReadOnly = computed(() => role.value === 'readonly')
  const isSelfService = computed(() => role.value === 'selfservice')
  const isTrusted = computed(() => role.value === 'admin' || role.value === 'checkin' || role.value === 'readonly')
  const isAuthenticated = computed(() => user.value !== null)

  return { user, ready, role, isAdmin, isCheckIn, isReadOnly, isSelfService, isTrusted, isAuthenticated }
}
