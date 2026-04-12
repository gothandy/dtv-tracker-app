import { createRouter, createWebHistory } from 'vue-router'
import { ensureAuth, user } from '../composables/useAuth'

declare module 'vue-router' {
  interface RouteMeta {
    requiresTrusted?: boolean  // Admin / Check In / Read Only only
    requiresAuth?: boolean     // Any authenticated user (self-service included)
  }
}
import HomePage from '../pages/HomePage.vue'
import GroupListPage from '../pages/GroupListPage.vue'
import PrivacyPage from '../pages/PrivacyPage.vue'
import TermsPage from '../pages/TermsPage.vue'
import LoginPage from '../pages/LoginPage.vue'
import GroupDetailPage from '../pages/GroupDetailPage.vue'
import SessionDetailPage from '../pages/SessionDetailPage.vue'
import SessionListPage from '../pages/SessionListPage.vue'
import AdminPage from '../pages/AdminPage.vue'
import ProfileListPage from '../pages/ProfileListPage.vue'
import ProfileDetailPage from '../pages/ProfileDetailPage.vue'

// Path builders — colocated with route definitions so URL structure has one home.
// Import these wherever a link to an entity is needed; never construct URLs inline.
export const sessionPath = (groupKey: string, date: string) => `/sessions/${groupKey}/${date}`
export const groupsPath = () => '/groups'
export const groupPath = (key: string) => `/groups/${key}`
export const sessionsPath = () => '/sessions'
export const profilesPath = () => '/profiles'
export const profilePath = (slug: string) => `/profiles/${slug}`
export const addEntryPath = (groupKey: string, date: string) => `/sessions/${groupKey}/${date}/add-entry`
export const entryPath = (id: number) => `/entries/${id}`
export const adminPath = () => '/admin'
export const consentPath = (slug: string) => `/profiles/${slug}/consent`
export const uploadPath  = (entryId: number) => `/upload?entryId=${entryId}`

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: (to, from) => to.path === from.path ? false : { top: 0 },
  routes: [
    { path: '/', component: HomePage },
    { path: '/groups', component: GroupListPage },
    { path: '/groups/:key', component: GroupDetailPage },
    { path: '/sessions', component: SessionListPage },
    { path: '/sessions/:groupKey/:date', component: SessionDetailPage },
    { path: '/privacy', component: PrivacyPage },
    { path: '/terms', component: TermsPage },
    { path: '/login', component: LoginPage },
    { path: '/admin', component: AdminPage },
    { path: '/not-found', component: () => import('../pages/NotFoundPage.vue') },
    { path: '/forbidden', component: () => import('../pages/ForbiddenPage.vue') },
    { path: '/profiles', component: ProfileListPage, meta: { requiresTrusted: true } },
    { path: '/profiles/:slug', component: ProfileDetailPage, meta: { requiresAuth: true } },
    { path: '/profiles/:slug/consent', component: () => import('../pages/ConsentPage.vue'), meta: { requiresAuth: true } },
    { path: '/upload', component: () => import('../pages/UploadPage.vue') },
    { path: '/sandbox', component: () => import('../pages/sandbox/SandboxIndex.vue') },
    { path: '/sandbox/app-button', component: () => import('../pages/sandbox/SandboxAppButton.vue') },
    { path: '/sandbox/action-bars', component: () => import('../pages/sandbox/SandboxActionBars.vue') },
    { path: '/sandbox/modals', component: () => import('../pages/sandbox/SandboxModals.vue') },
    { path: '/sandbox/modal-layout', component: () => import('../pages/sandbox/SandboxModalLayout.vue') },
    { path: '/sandbox/colour-palette', component: () => import('../pages/sandbox/SandboxColourPalette.vue') },
    { path: '/sandbox/icons', component: () => import('../pages/sandbox/SandboxIcons.vue') },
    { path: '/sandbox/font-stack', component: () => import('../pages/sandbox/SandboxFontStack.vue') },
    { path: '/sandbox/form-components', component: () => import('../pages/sandbox/SandboxFormComponents.vue') },
    { path: '/sandbox/calendar-widget', component: () => import('../pages/sandbox/SandboxCalendarWidget.vue') },
    { path: '/sandbox/layout-columns', component: () => import('../pages/sandbox/SandboxLayoutColumns.vue') },
    { path: '/sandbox/concertina-layout', component: () => import('../pages/sandbox/SandboxConcertinaLayout.vue') },
    { path: '/sandbox/fy-bar-chart', component: () => import('../pages/sandbox/SandboxFyBarChart.vue') },
    { path: '/sandbox/term-cloud', component: () => import('../pages/sandbox/SandboxTermCloud.vue') },
    { path: '/sandbox/media-card', component: () => import('../pages/sandbox/SandboxMediaCard.vue') },
    { path: '/sandbox/media-carousel', component: () => import('../pages/sandbox/SandboxMediaCarousel.vue') },
    { path: '/sandbox/session-card', component: () => import('../pages/sandbox/SandboxSessionCard.vue') },
    { path: '/sandbox/group-card', component: () => import('../pages/sandbox/SandboxGroupCard.vue') },
    { path: '/sandbox/entry-card', component: () => import('../pages/sandbox/SandboxEntryCard.vue') },
    { path: '/sandbox/entry-list', component: () => import('../pages/sandbox/SandboxEntryList.vue') },
    { path: '/sandbox/filter-components', component: () => import('../pages/sandbox/SandboxFilterComponents.vue') },
    { path: '/sandbox/session-term-list', component: () => import('../pages/sandbox/SandboxSessionTermList.vue') },
    { path: '/sandbox/profile-record-list', component: () => import('../pages/sandbox/SandboxProfileRecordList.vue') },
    { path: '/sandbox/profile-list-item', component: () => import('../pages/sandbox/SandboxProfileListItem.vue') },
    { path: '/sandbox/profile-list-results', component: () => import('../pages/sandbox/SandboxProfileListResults.vue') },
    { path: '/sandbox/profile-group-list', component: () => import('../pages/sandbox/SandboxProfileGroupList.vue') },
    { path: '/sandbox/profile-group-item', component: () => import('../pages/sandbox/SandboxProfileGroupItem.vue') },
    { path: '/sandbox/flash-message', component: () => import('../pages/sandbox/SandboxFlashMessage.vue') },
    { path: '/sandbox/login-page', component: () => import('../pages/sandbox/SandboxLoginPage.vue') },
    { path: '/sandbox/consent-page', component: () => import('../pages/sandbox/SandboxConsentPage.vue') },
    { path: '/sandbox/upload-page', component: () => import('../pages/sandbox/SandboxUploadPage.vue') },
    { path: '/sandbox/error-pages', component: () => import('../pages/sandbox/SandboxErrorPages.vue') },
    { path: '/:pathMatch(.*)*', component: () => import('../pages/NotFoundPage.vue') },
  ]
})

router.beforeEach(async (to) => {
  if (to.meta.requiresTrusted || to.meta.requiresAuth) {
    await ensureAuth()
    if (!user.value) return '/not-found'
    if (to.meta.requiresTrusted && user.value.role === 'selfservice') return '/forbidden'
    return
  }

  if (!to.path.startsWith('/sandbox')) return
  if (import.meta.env.DEV) return
  await ensureAuth()
  if (user.value?.role !== 'admin') return '/'
})

