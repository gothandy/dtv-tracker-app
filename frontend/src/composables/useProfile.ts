// Single UI composable for auth/profile context.
// Pages and components import from here only — never from useAuth or useRole directly.
import { computed, reactive } from 'vue'
import { useAuth } from './useAuth'

export interface RoleContext {
  isAdmin: boolean
  isCheckIn: boolean
  isReadOnly: boolean
  isSelfService: boolean
  isTrusted: boolean
  isAuthenticated: boolean
  isPublic: boolean
  isOperational: boolean
}

export function useProfile() {
  const { user, ready } = useAuth()

  const role = computed(() => user.value?.role ?? null)

  const isAdmin         = computed(() => role.value === 'admin')
  const isCheckIn       = computed(() => role.value === 'checkin')
  const isReadOnly      = computed(() => role.value === 'readonly')
  const isSelfService   = computed(() => role.value === 'selfservice')
  const isTrusted       = computed(() => role.value === 'admin' || role.value === 'checkin' || role.value === 'readonly')
  const isAuthenticated = computed(() => user.value !== null)
  const isPublic        = computed(() => ready.value && !isAuthenticated.value)
  const isOperational   = computed(() => isAdmin.value || isCheckIn.value)

  // Snapshot object for passing to components as a `profile` prop
  const context = computed<RoleContext>(() => ({
    isAdmin: isAdmin.value,
    isCheckIn: isCheckIn.value,
    isReadOnly: isReadOnly.value,
    isSelfService: isSelfService.value,
    isTrusted: isTrusted.value,
    isAuthenticated: isAuthenticated.value,
    isPublic: isPublic.value,
    isOperational: isOperational.value,
  }))

  return reactive({ user, ready, role, isAdmin, isCheckIn, isReadOnly, isSelfService, isTrusted, isAuthenticated, isPublic, isOperational, context })
}
