// Single UI composable for auth/role context of the logged-in viewer.
// Pages and components import from here only — never from useAuth or useRole directly.
import { computed, reactive } from 'vue'
import { useAuth } from './useAuth'

export interface RoleContext {
  isAdmin: boolean
  isCheckIn: boolean
  isSelfService: boolean
  isTrusted: boolean
  isAuthenticated: boolean
  isPublic: boolean
  /** Check-in tier: field-day / registration capabilities (admin includes this). */
  hasCheckInAccess: boolean
}

export function useViewer() {
  const { user, ready } = useAuth()

  const role = computed(() => user.value?.role ?? null)

  const isAdmin         = computed(() => role.value === 'admin')
  const isCheckIn       = computed(() => role.value === 'checkin')
  const isSelfService   = computed(() => role.value === 'selfservice')
  const isTrusted       = computed(() => role.value === 'admin' || role.value === 'checkin')
  const isAuthenticated = computed(() => user.value !== null)
  const isPublic        = computed(() => ready.value && !isAuthenticated.value)
  const hasCheckInAccess = computed(() => isAdmin.value || isCheckIn.value)

  // Snapshot object for passing to components as a `profile` prop
  const context = computed<RoleContext>(() => ({
    isAdmin: isAdmin.value,
    isCheckIn: isCheckIn.value,
    isSelfService: isSelfService.value,
    isTrusted: isTrusted.value,
    isAuthenticated: isAuthenticated.value,
    isPublic: isPublic.value,
    hasCheckInAccess: hasCheckInAccess.value,
  }))

  return reactive({ user, ready, role, isAdmin, isCheckIn, isSelfService, isTrusted, isAuthenticated, isPublic, hasCheckInAccess, context })
}
