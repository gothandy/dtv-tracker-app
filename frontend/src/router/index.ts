import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../pages/HomePage.vue'
import PrivacyPage from '../pages/PrivacyPage.vue'
import TermsPage from '../pages/TermsPage.vue'
import AboutPage from '../pages/AboutPage.vue'
import LoginPage from '../pages/LoginPage.vue'
import SessionDetailPage from '../pages/SessionDetailPage.vue'

// Path builders — colocated with route definitions so URL structure has one home.
// Import these wherever a link to an entity is needed; never construct URLs inline.
export function sessionPath(groupKey: string, date: string): string {
  return `/sessions/${groupKey}/${date}`
}

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: HomePage },
    { path: '/sessions/:groupKey/:date', component: SessionDetailPage },
    { path: '/privacy', component: PrivacyPage },
    { path: '/terms', component: TermsPage },
    { path: '/about', component: AboutPage },
    { path: '/login', component: LoginPage },
  ]
})
