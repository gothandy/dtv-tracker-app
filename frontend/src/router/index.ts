import { createRouter, createWebHistory } from 'vue-router'
import { ensureAuth, user } from '../composables/useAuth'
import HomePage from '../pages/HomePage.vue'
import GroupsPage from '../pages/GroupsPage.vue'
import PrivacyPage from '../pages/PrivacyPage.vue'
import TermsPage from '../pages/TermsPage.vue'
import AboutPage from '../pages/AboutPage.vue'
import LoginPage from '../pages/LoginPage.vue'
import GroupDetailPage from '../pages/GroupDetailPage.vue'
import SessionDetailPage from '../pages/SessionDetailPage.vue'
import SessionsPage from '../pages/SessionsPage.vue'
import AdminPage from '../pages/AdminPage.vue'

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

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: (to, from) => to.path === from.path ? false : { top: 0 },
  routes: [
    { path: '/', component: HomePage },
    { path: '/groups', component: GroupsPage },
    { path: '/groups/:key', component: GroupDetailPage },
    { path: '/sessions', component: SessionsPage },
    { path: '/sessions/:groupKey/:date', component: SessionDetailPage },
    { path: '/privacy', component: PrivacyPage },
    { path: '/terms', component: TermsPage },
    { path: '/about', component: AboutPage },
    { path: '/login', component: LoginPage },
    { path: '/admin', component: AdminPage },
    { path: '/sandbox', component: () => import('../pages/sandbox/SandboxIndex.vue') },
    { path: '/sandbox/app-button', component: () => import('../pages/sandbox/SandboxAppButton.vue') },
    { path: '/sandbox/action-bars', component: () => import('../pages/sandbox/SandboxActionBars.vue') },
    { path: '/sandbox/modals', component: () => import('../pages/sandbox/SandboxModals.vue') },
    { path: '/sandbox/modal-layout', component: () => import('../pages/sandbox/SandboxModalLayout.vue') },
    { path: '/sandbox/colour-palette', component: () => import('../pages/sandbox/SandboxColourPalette.vue') },
    { path: '/sandbox/form-components', component: () => import('../pages/sandbox/SandboxFormComponents.vue') },
    { path: '/sandbox/calendar-widget', component: () => import('../pages/sandbox/SandboxCalendarWidget.vue') },
    { path: '/sandbox/layout-columns', component: () => import('../pages/sandbox/SandboxLayoutColumns.vue') },
    { path: '/sandbox/concertina-layout', component: () => import('../pages/sandbox/SandboxConcertinaLayout.vue') },
    { path: '/sandbox/fy-bar-chart', component: () => import('../pages/sandbox/SandboxFyBarChart.vue') },
    { path: '/sandbox/tag-cloud', component: () => import('../pages/sandbox/SandboxTagCloud.vue') },
    { path: '/sandbox/media-card', component: () => import('../pages/sandbox/SandboxMediaCard.vue') },
    { path: '/sandbox/media-carousel', component: () => import('../pages/sandbox/SandboxMediaCarousel.vue') },
  ]
})

router.beforeEach(async (to) => {
  if (!to.path.startsWith('/sandbox')) return
  if (import.meta.env.DEV) return
  await ensureAuth()
  if (user.value?.role !== 'admin') return '/'
})
