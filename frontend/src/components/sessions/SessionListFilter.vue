<template>
  <div class="list-filter sf-wrap">
    <input
      v-model="search"
      type="text"
      class="list-filter-search"
      placeholder="Search sessions…"
      autocomplete="off"
    />
    <FyFilter v-model="fy" />
    <select v-model="groupKey" class="list-filter-select">
      <option value="">All groups</option>
      <option v-for="g in groupOptions" :key="g.key" :value="g.key">{{ g.name }}</option>
    </select>
    <select v-model="projectKey" class="list-filter-select">
      <option value="">All projects</option>
      <option value="__none__">No project</option>
      <option v-for="p in projectOptions" :key="p.key" :value="p.key">{{ p.title }}</option>
    </select>
    <select v-model="mediaStatus" class="list-filter-select" aria-label="Photos filter">
      <option value="">All sessions</option>
      <option v-if="profile?.hasCheckInAccess" value="none">No photos</option>
      <option v-if="profile?.hasCheckInAccess" value="allPrivate">All photos private</option>
      <option v-if="profile?.hasCheckInAccess" value="noCover">No cover photo</option>
      <option value="public">Public cover</option>
    </select>
    <TermPicker
      v-model="tagLabel"
      :tree="taxonomyTree"
      :loading="taxonomyLoading"
      :show-no-tags="true"
      :available-labels="availableTagLabels"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FyFilter from '../FyFilter.vue'
import TermPicker from '../TermPicker.vue'
import { useTaxonomy } from '../../composables/useTaxonomy'
import type { RoleContext } from '../../composables/useViewer'
import type { MediaStatus } from '../../types/session'
import type { Session } from '../../types/session'

const TRUSTED_MEDIA_FILTERS = new Set<MediaStatus>(['none', 'allPrivate', 'noCover'])

const props = defineProps<{ sessions: Session[]; profile?: RoleContext }>()
const emit = defineEmits<{ filtered: [sessions: Session[]] }>()

const { tree: taxonomyTree, loading: taxonomyLoading } = useTaxonomy()

const route = useRoute()
const router = useRouter()
const fy       = ref((route.query.fy as string) || 'future')
const search   = ref((route.query.search as string) || '')
const groupKey = ref((route.query.group as string) || '')
const projectKey = ref((route.query.project as string) || '')
const tagLabel = ref((route.query.tag as string) || '')

function mediaFromRouteQuery(): string {
  const raw = (route.query.media as string) || ''
  if (raw === 'public') return 'public'
  if (TRUSTED_MEDIA_FILTERS.has(raw as MediaStatus)) return raw
  return ''
}

const mediaStatus = ref(mediaFromRouteQuery())

// Trusted media filters require check-in access — but auth loads after first paint on refresh.
// Keep the URL value until we know the viewer is not check-in/admin.
watch(
  () => [props.profile?.isPublic, props.profile?.isAuthenticated, props.profile?.hasCheckInAccess] as const,
  ([isPublic, isAuthenticated, hasAccess]) => {
    const raw = mediaFromRouteQuery()
    if (!raw) return
    if (raw === 'public') {
      mediaStatus.value = 'public'
      return
    }
    if (!isPublic && !isAuthenticated && !hasAccess) return
    mediaStatus.value = hasAccess ? raw : ''
  },
  { immediate: true },
)

function rollingStart(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 1)
  return d.toISOString().slice(0, 10)
}

function applyBase(list: Session[]): Session[] {
  let r = list
  if (fy.value === 'future')
    r = r.filter(s => s.date >= new Date().toISOString().slice(0, 10))
  else if (fy.value === 'rolling')
    r = r.filter(s => s.date >= rollingStart() && s.date <= new Date().toISOString().slice(0, 10))
  else if (fy.value && fy.value !== 'all')
    r = r.filter(s => s.financialYear === fy.value)
  if (search.value.length >= 3) {
    const q = search.value.toLowerCase()
    r = r.filter(s =>
      (s.displayName ?? '').toLowerCase().includes(q) ||
      (s.groupName ?? '').toLowerCase().includes(q) ||
      (s.description ?? '').toLowerCase().includes(q)
    )
  }
  return r
}

function applyGroup(list: Session[]): Session[] {
  return groupKey.value ? list.filter(s => s.groupKey === groupKey.value) : list
}

function applyProject(list: Session[]): Session[] {
  if (!projectKey.value) return list
  if (projectKey.value === '__none__') return list.filter(s => !s.projectId)
  return list.filter(s =>
    s.projectKey === projectKey.value || String(s.projectId) === projectKey.value,
  )
}

function applyTag(list: Session[]): Session[] {
  if (!tagLabel.value) return list
  if (tagLabel.value === '__none__') return list.filter(s => !s.metadata?.length)
  return list.filter(s =>
    s.metadata?.some(t => t.label === tagLabel.value || t.label.startsWith(tagLabel.value + ':')) ?? false
  )
}

function applyMedia(list: Session[]): Session[] {
  if (!mediaStatus.value) return list
  if (mediaStatus.value === 'none') {
    return list.filter(s => s.stats.mediaStatus === 'none')
  }
  if (mediaStatus.value === 'noCover') {
    return list.filter(s =>
      s.stats.mediaStatus === 'noCover'
      && !s.coverUrl,
    )
  }
  return list.filter(s => s.stats.mediaStatus === mediaStatus.value)
}

// Cascading: each dropdown only shows options present in sessions matching all other filters
const base = computed(() => applyBase(props.sessions))

const groupOptions = computed(() => {
  const map = new Map<string, string>()
  for (const s of applyMedia(applyProject(applyTag(base.value)))) {
    if (s.groupKey && s.groupName) map.set(s.groupKey, s.groupName)
  }
  return [...map.entries()].map(([key, name]) => ({ key, name })).sort((a, b) => a.name.localeCompare(b.name))
})

const projectOptions = computed(() => {
  const map = new Map<string, { key: string; title: string }>()
  for (const s of applyMedia(applyTag(applyGroup(base.value)))) {
    if (!s.projectId) continue
    const key = s.projectKey ?? String(s.projectId)
    const title = s.projectTitle ?? s.projectKey ?? String(s.projectId)
    map.set(key, { key, title })
  }
  return [...map.values()].sort((a, b) => a.title.localeCompare(b.title))
})

const availableTagLabels = computed(() => {
  const labels = new Set<string>()
  for (const s of applyMedia(applyProject(applyGroup(base.value)))) s.metadata?.forEach(t => labels.add(t.label))
  return labels
})

const filtered = computed(() => {
  const list = applyMedia(applyProject(applyTag(applyGroup(base.value))))
  return fy.value === 'future'
    ? [...list].sort((a, b) => a.date.localeCompare(b.date))
    : list
})

watch(filtered, list => emit('filtered', list), { immediate: true })

watch(projectOptions, opts => {
  if (!projectKey.value || projectKey.value === '__none__') return
  if (!opts.some(p => p.key === projectKey.value)) projectKey.value = ''
}, { immediate: true })

watch([fy, search, groupKey, projectKey, tagLabel, mediaStatus], ([newFy, newSearch, newGroup, newProject, newTag, newMedia]) => {
  const query: Record<string, string> = {}
  if (newFy)     query.fy     = newFy
  if (newSearch) query.search = newSearch
  if (newGroup)  query.group  = newGroup
  if (newProject) query.project = newProject
  if (newTag)    query.tag    = newTag
  if (newMedia)  query.media  = newMedia
  router.replace({ query })
})
</script>

<style scoped>
.sf-wrap :deep(.tp-wrap) { flex: 1 1 140px; display: flex; flex-direction: column; }
.sf-wrap :deep(.tp-btn) { flex: 1; width: 100%; justify-content: space-between; }
</style>
