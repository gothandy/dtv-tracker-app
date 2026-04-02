import { createRouter, createWebHistory } from 'vue-router'
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
  scrollBehavior: () => ({ top: 0 }),
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
  ]
})
