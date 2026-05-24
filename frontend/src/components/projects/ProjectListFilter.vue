<template>
  <div class="pf-wrap">
    <div class="pf-title-row">
      <div class="pf-actions">
        <FyFilter v-model="fy" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FyFilter from '../FyFilter.vue'
import type { ProjectResponse } from '../../../../types/api-responses'
import type { Session } from '../../types/session'
import { withSessionTotals } from '../../utils/entitySessionTotals'

export interface ProjectWithStats extends ProjectResponse {
  sessionCount: number
  hours: number
}

const props = defineProps<{ projects: ProjectResponse[]; sessions: Session[] }>()
const emit = defineEmits<{ filtered: [projects: ProjectWithStats[]] }>()

const route = useRoute()
const router = useRouter()

const fy = ref((route.query.fy as string) || 'future')

// Always list every project; FY filter only affects session/hours totals (projects may have no linked sessions yet).
const filtered = computed<ProjectWithStats[]>(() =>
  withSessionTotals(props.projects, props.sessions, (p, s) => s.projectId === p.id, fy.value)
)

watch(filtered, list => emit('filtered', list), { immediate: true })

watch(fy, newFy => {
  router.replace({ query: newFy ? { fy: newFy } : {} })
})
</script>

<style scoped>
.pf-wrap {
  background: var(--color-dtv-sand);
  padding: 1rem 1.5rem;
  margin-bottom: 1.5rem;
}

.pf-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.pf-actions {
  margin-left: auto;
}
</style>
