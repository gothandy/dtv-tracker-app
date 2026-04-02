<template>
  <DefaultLayout>
    <PageTitle>Admin</PageTitle>
    <div class="pt-3 pb-8">

      <div v-if="!ready" class="ap-status">Loading…</div>

      <template v-else-if="isAdmin">

        <!-- Eventbrite -->
        <div class="ap-section">
          <h2 class="ap-title">
            <a href="https://dtv.eventbrite.co.uk/" target="_blank" rel="noopener">Eventbrite</a>
          </h2>
          <div class="ap-actions">
            <button class="ap-btn" :disabled="runningAll" @click="runAll">
              {{ runningAll ? 'Running…' : 'Run All' }}
            </button>
            <button class="ap-btn" :disabled="sessionsLoading" @click="syncSessions">
              {{ sessionsLoading ? 'Syncing…' : 'Refresh Events' }}
            </button>
            <button class="ap-btn" :disabled="attendeesLoading" @click="syncAttendees">
              {{ attendeesLoading ? 'Syncing…' : 'Fetch New Attendees' }}
            </button>
            <button class="ap-btn" :disabled="unmatchedLoading" @click="loadUnmatched">
              {{ unmatchedLoading ? 'Loading…' : 'Unmatched Events' }}
            </button>
            <button class="ap-btn" :disabled="configLoading" @click="checkConfig">
              {{ configLoading ? 'Checking…' : 'Check Config' }}
            </button>
          </div>
          <div v-if="sessionsResult" :class="['ap-result', sessionsResultError && 'ap-error']">{{ sessionsResult }}</div>
          <div v-if="attendeesResult" :class="['ap-result', attendeesResultError && 'ap-error']">{{ attendeesResult }}</div>
          <div v-if="unmatchedItems !== null" class="ap-list">
            <div v-if="unmatchedItems.length === 0" class="ap-result">No unmatched events</div>
            <template v-else>
              <div v-for="e in unmatchedItems" :key="e.eventId" class="ap-list-item">
                <span>{{ e.date }}</span>
                <span>{{ e.name }}</span>
                <code class="ap-code">{{ e.eventId }}</code>
              </div>
            </template>
          </div>
          <div v-if="configItems !== null" class="ap-list">
            <div v-if="configItems.length === 0" class="ap-result">No matched live events found</div>
            <template v-else>
              <div v-for="e in configItems" :key="e.eventName" class="ap-list-item">
                <span>{{ e.eventName }}</span>
                <span class="ap-checks">
                  <span v-for="c in eventChecks(e)" :key="c.label" :class="c.ok ? 'ap-ok' : 'ap-fail'">
                    {{ c.ok ? '✓' : '✗' }} {{ c.label }}
                  </span>
                </span>
              </div>
            </template>
          </div>
        </div>

        <!-- Exports -->
        <div class="ap-section">
          <h2 class="ap-title">Exports</h2>
          <div class="ap-actions">
            <a class="ap-btn" href="/api/sessions/export">FE Hours Download</a>
            <a class="ap-btn" href="/api/records/export">Records Download</a>
          </div>
        </div>

        <!-- Stats Cache -->
        <div class="ap-section">
          <h2 class="ap-title">Stats Cache</h2>
          <div class="ap-actions">
            <button class="ap-btn" :disabled="sessionStatsLoading" @click="refreshSessionStats">
              {{ sessionStatsLoading ? 'Refreshing…' : 'Refresh Session Stats' }}
            </button>
            <button class="ap-btn" :disabled="profileStatsLoading" @click="refreshProfileStats">
              {{ profileStatsLoading ? 'Refreshing…' : 'Refresh Profile Stats' }}
            </button>
          </div>
          <div v-if="sessionStatsResult" :class="['ap-result', sessionStatsError && 'ap-error']">{{ sessionStatsResult }}</div>
          <div v-if="profileStatsResult" :class="['ap-result', profileStatsError && 'ap-error']">{{ profileStatsResult }}</div>
        </div>

        <!-- Site shortcuts (shown when config returns a SharePoint site URL) -->
        <div v-if="siteUrl" class="ap-section">
          <h2 class="ap-title">
            <a :href="siteUrl" target="_blank" rel="noopener">{{ siteLabel }}</a>
          </h2>
          <div class="ap-actions">
            <a class="ap-btn" :href="siteContentsUrl" target="_blank" rel="noopener">Site Contents</a>
            <a class="ap-btn" :href="termStoreUrl" target="_blank" rel="noopener">Term Store</a>
            <button class="ap-btn" :disabled="backupLoading" @click="exportBackup">
              {{ backupLoading ? 'Exporting…' : 'Backup' }}
            </button>
          </div>
          <div v-if="backupResult" :class="['ap-result', backupError && 'ap-error']">{{ backupResult }}</div>
        </div>

        <!-- Icon Legend -->
        <div class="ap-section">
          <h2 class="ap-title">Icon Legend</h2>
          <div class="ap-legend">
            <div
              v-for="t in TAG_ICONS"
              :key="t.alt"
              :class="['ap-legend-item', t.color && `icon-${t.color}`]"
            >
              <img :src="`/svg/${t.icon}`" :alt="t.alt" class="ap-icon" />
              <span>{{ t.alt }}</span>
            </div>
          </div>
        </div>

      </template>

    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import PageTitle from '../components/PageTitle.vue'
import { useRole } from '../composables/useRole'
import { usePageTitle } from '../composables/usePageTitle'
import { TAG_ICONS } from '../utils/tagIcons'

usePageTitle('Admin')

const router = useRouter()
const { ready, isAdmin } = useRole()

watch(ready, (r) => {
  if (r && !isAdmin.value) router.replace('/')
}, { immediate: true })

// ── Eventbrite ─────────────────────────────────────────────────────────────

const runningAll        = ref(false)
const sessionsLoading   = ref(false)
const sessionsResult    = ref('')
const sessionsResultError = ref(false)
const attendeesLoading  = ref(false)
const attendeesResult   = ref('')
const attendeesResultError = ref(false)
const unmatchedLoading  = ref(false)
const unmatchedItems    = ref<{ date: string; name: string; eventId: string }[] | null>(null)
const configLoading     = ref(false)
const configItems       = ref<any[] | null>(null)

async function syncSessions() {
  sessionsLoading.value = true
  sessionsResult.value = ''
  sessionsResultError.value = false
  try {
    const res = await fetch('/api/eventbrite/sync-sessions', { method: 'POST' })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.error || 'Sync failed')
    const d = data.data
    sessionsResult.value = `${d.totalEvents} events, ${d.matchedEvents} matched, ${d.newSessions} new sessions`
  } catch (e: any) {
    sessionsResult.value = e.message || 'Sync failed'
    sessionsResultError.value = true
  } finally {
    sessionsLoading.value = false
  }
}

async function syncAttendees() {
  attendeesLoading.value = true
  attendeesResult.value = ''
  attendeesResultError.value = false
  try {
    const res = await fetch('/api/eventbrite/sync-attendees', { method: 'POST' })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.error || 'Sync failed')
    const d = data.data
    let msg = `${d.sessionsProcessed} sessions, ${d.newProfiles} new profiles, ${d.newEntries} new entries`
    if (d.newRecords) msg += `, ${d.newRecords} consent records`
    attendeesResult.value = msg
  } catch (e: any) {
    attendeesResult.value = e.message || 'Sync failed'
    attendeesResultError.value = true
  } finally {
    attendeesLoading.value = false
  }
}

async function loadUnmatched() {
  unmatchedLoading.value = true
  unmatchedItems.value = null
  try {
    const res = await fetch('/api/eventbrite/unmatched-events')
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to fetch')
    unmatchedItems.value = data.data
  } catch (e: any) {
    console.error('Unmatched events fetch failed:', e)
    unmatchedItems.value = []
  } finally {
    unmatchedLoading.value = false
  }
}

async function checkConfig() {
  configLoading.value = true
  configItems.value = null
  try {
    const res = await fetch('/api/eventbrite/event-config-check')
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.error || 'Check failed')
    configItems.value = data.data
  } catch (e: any) {
    console.error('Config check failed:', e)
    configItems.value = []
  } finally {
    configLoading.value = false
  }
}

function eventChecks(e: any) {
  return [
    { label: 'Per Attendee', ok: e.consentQuestionsPerAttendee },
    { label: 'Child Ticket', ok: e.hasChildTicket },
    { label: 'Privacy Q',    ok: e.hasPrivacyConsentQuestion },
    { label: 'Photo Q',      ok: e.hasPhotoConsentQuestion },
  ]
}

async function runAll() {
  runningAll.value = true
  try {
    await syncSessions()
    await syncAttendees()
    await loadUnmatched()
  } finally {
    runningAll.value = false
  }
}

// ── Stats Cache ────────────────────────────────────────────────────────────

const sessionStatsLoading = ref(false)
const sessionStatsResult  = ref('')
const sessionStatsError   = ref(false)
const profileStatsLoading = ref(false)
const profileStatsResult  = ref('')
const profileStatsError   = ref(false)

async function refreshSessionStats() {
  sessionStatsLoading.value = true
  sessionStatsResult.value = ''
  sessionStatsError.value = false
  try {
    const res = await fetch('/api/sessions/refresh-stats', { method: 'POST' })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.error || 'Refresh failed')
    const d = data.data
    let msg = `${d.updated} of ${d.total} sessions updated`
    if (d.errors?.length) msg += ` (${d.errors.length} errors)`
    sessionStatsResult.value = msg
  } catch (e: any) {
    sessionStatsResult.value = e.message || 'Refresh failed'
    sessionStatsError.value = true
  } finally {
    sessionStatsLoading.value = false
  }
}

async function refreshProfileStats() {
  profileStatsLoading.value = true
  profileStatsResult.value = ''
  profileStatsError.value = false
  try {
    const res = await fetch('/api/profiles/refresh-stats', { method: 'POST' })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.error || 'Refresh failed')
    const d = data.data
    let msg = `${d.updated} of ${d.total} profiles updated`
    if (d.errors?.length) msg += ` (${d.errors.length} errors)`
    profileStatsResult.value = msg
  } catch (e: any) {
    profileStatsResult.value = e.message || 'Refresh failed'
    profileStatsError.value = true
  } finally {
    profileStatsLoading.value = false
  }
}

// ── Site / Backup ──────────────────────────────────────────────────────────

const siteUrl      = ref<string | null>(null)
const siteLabel    = computed(() => siteUrl.value?.includes('/tracker') ? 'Tracker Site' : 'Members Site')
const siteContentsUrl = 'https://dtvolunteers.sharepoint.com/sites/Tracker/_layouts/15/viewlsts.aspx?view=14'
const termStoreUrl    = 'https://dtvolunteers.sharepoint.com/sites/Tracker/_layouts/15/SiteAdmin.aspx#/termStoreAdminCenter'
const backupLoading   = ref(false)
const backupResult    = ref('')
const backupError     = ref(false)

async function loadSiteConfig() {
  try {
    const res = await fetch('/api/config')
    const data = await res.json()
    if (data.success && data.data.sharepointSiteUrl) {
      siteUrl.value = data.data.sharepointSiteUrl
    }
  } catch { /* site section stays hidden */ }
}

async function exportBackup() {
  backupLoading.value = true
  backupResult.value = ''
  backupError.value = false
  try {
    const res = await fetch('/api/backup/export-all', { method: 'POST' })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.error || 'Export failed')
    const { updated, skipped, timestamp } = data.data
    const time = new Date(timestamp).toLocaleTimeString()
    backupResult.value = updated.length
      ? `Exported at ${time} — ${updated.join(', ')} updated` + (skipped.length ? ` (${skipped.join(', ')} unchanged)` : '')
      : `Exported at ${time} — no changes`
  } catch (e: any) {
    backupResult.value = e.message || 'Export failed'
    backupError.value = true
  } finally {
    backupLoading.value = false
  }
}

onMounted(loadSiteConfig)
</script>

<style scoped>
.ap-status {
  padding: 2rem;
  text-align: center;
  color: var(--color-text-muted);
}

.ap-section {
  background: var(--color-white);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.ap-title {
  color: var(--color-text);
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 1rem;
}
.ap-title a {
  color: var(--color-dtv-green);
  text-decoration: none;
}
.ap-title a:hover { text-decoration: underline; }

.ap-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.ap-btn {
  display: inline-flex;
  align-items: center;
  padding: 0.6rem 1.1rem;
  border: 2px solid var(--color-dtv-green);
  background: var(--color-white);
  color: var(--color-dtv-green);
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
}
.ap-btn:hover {
  background: var(--color-dtv-green);
  color: var(--color-white);
}
.ap-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ap-result {
  margin-top: 0.75rem;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}
.ap-error { color: var(--color-error); }

.ap-list {
  margin-top: 0.75rem;
  font-size: 0.9rem;
}
.ap-list-item {
  display: flex;
  gap: 1rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
}
.ap-list-item:last-child { border-bottom: none; }
.ap-code {
  color: var(--color-text-muted);
  font-family: monospace;
  font-size: 0.85rem;
}
.ap-checks {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
}
.ap-ok   { color: var(--color-dtv-green); }
.ap-fail { color: var(--color-error); }

.ap-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.5rem;
}
.ap-legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  color: var(--color-text-secondary);
}
.ap-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
}
</style>
