<template>
  <LoadingSpinner v-if="loading" />
  <div v-else-if="error" class="pr-state pr-state--error">{{ error }}</div>
  <div v-else-if="!projects.length && !emptyTrails.length" class="pr-state">No projects found.</div>
  <template v-else>
    <!-- Select all: Bulk actions (bulkProjects); projects only, not the trail cards. -->
    <div v-if="selected && projects.length" class="list-select-row">
      <button class="list-select-all" @click="toggleSelectAll">
        {{ allSelected ? 'Deselect all' : 'Select all' }}
      </button>
    </div>
    <!-- Show all trails: grouped by top-level tag, each heading setting the tag filter. -->
    <template v-if="groups">
      <template v-for="section in sections" :key="section.top || 'none'">
        <div class="list-select-row">
          <h2 class="list-group-heading">
            <button v-if="section.top" class="list-select-all" @click="emit('filter-tag', section.top)">{{ section.top }}</button>
            <span v-else>{{ NO_LOCATION }}</span>
          </h2>
        </div>
        <div class="list-card-grid">
          <template v-for="g in section.groups" :key="g.path">
            <div v-for="p in g.projects" :key="p.key" class="list-card-item">
              <input
                v-if="selected"
                type="checkbox"
                class="list-card-checkbox"
                :checked="selected.includes(p.id)"
                @change="toggle(p.id)"
              />
              <ProjectCard :project="p" />
            </div>
            <div v-if="!g.projects.length" class="list-card-item">
              <ProjectTrailCard :trail="g.path" :can-add="canAdd" @add="emit('add-project', $event)" />
            </div>
          </template>
        </div>
      </template>
    </template>
    <div v-else class="list-card-grid">
      <div v-for="p in projects" :key="p.key" class="list-card-item">
        <input
          v-if="selected"
          type="checkbox"
          class="list-card-checkbox"
          :checked="selected.includes(p.id)"
          @change="toggle(p.id)"
        />
        <ProjectCard :project="p" />
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ProjectCard from './ProjectCard.vue'
import ProjectTrailCard from './ProjectTrailCard.vue'
import type { ProjectWithStats } from './ProjectListFilter.vue'
import LoadingSpinner from '../LoadingSpinner.vue'
import { NO_LOCATION, type LocationGroup } from '../../utils/projectsByLocation'

const props = withDefaults(defineProps<{
  projects: ProjectWithStats[]
  /** Trails without projects (FY "Show all trails"), shown after the projects */
  emptyTrails?: string[]
  /** Show all trails: the projects grouped by trail (projectsByLocation), shown by top-level tag */
  groups?: LocationGroup<ProjectWithStats>[] | null
  /** May add projects, from a trail card (permission editProjects) */
  canAdd?: boolean
  /** Selected project IDs; only for Bulk actions (permission bulkProjects) */
  selected?: number[]
  loading?: boolean
  error?: string | null
}>(), {
  emptyTrails: () => [],
  canAdd: false,
})

const emit = defineEmits<{
  'update:selected': [ids: number[]]
  /** Add a project at this trail */
  'add-project': [trail: string]
  /** Filter to this tag (a top-level heading) */
  'filter-tag': [tag: string]
}>()

/** The groups under their top-level tags, in order; (No location) last. */
const sections = computed(() => {
  const out: Array<{ top: string; groups: LocationGroup<ProjectWithStats>[] }> = []
  for (const g of props.groups ?? []) {
    const last = out[out.length - 1]
    if (last && last.top === g.top) last.groups.push(g)
    else out.push({ top: g.top, groups: [g] })
  }
  return out
})

const allSelected = computed(() =>
  props.projects.length > 0 && props.projects.every(p => props.selected?.includes(p.id))
)

function toggleSelectAll() {
  emit('update:selected', allSelected.value ? [] : props.projects.map(p => p.id))
}

function toggle(id: number) {
  if (!props.selected) return
  const next = props.selected.includes(id)
    ? props.selected.filter(i => i !== id)
    : [...props.selected, id]
  emit('update:selected', next)
}
</script>

<style scoped>
.pr-state { text-align: center; padding: 3rem; color: var(--color-text-muted); }
.pr-state--error { color: var(--color-dtv-red); }
</style>
