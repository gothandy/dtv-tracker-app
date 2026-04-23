<template>
  <div v-if="canBulkTag" class="list-actions">
    <span class="list-actions-stats">
      {{ selected.length }} / {{ groups.length }} groups &nbsp;&nbsp; {{ selectedHours }} / {{ totalHours }} hours
    </span>
    <div class="list-actions-buttons">
      <AppButton label="Download CSV" icon="download" mode="icon-only" :disabled="!selectedGroups.length" @click="onDownload" />
      <AppButton label="Share" icon="share" mode="icon-only" @click="onShare" />
      <AppButton label="New group" icon="add" mode="icon-only" @click="showNew = true" />
    </div>
  </div>

  <GroupAddModal
    v-if="showNew"
    :working="saving"
    :error="saveError"
    @close="showNew = false; saveError = ''"
    @add="onAdd"
  />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '../AppButton.vue'
import GroupAddModal from '../../pages/modals/GroupAddModal.vue'
import type { AddGroupPayload } from '../../pages/modals/GroupAddModal.vue'
import { downloadCsv } from '../../utils/listCsv'
import { shareCurrentUrl } from '../../utils/shareUrl'
import { useGroupListStore } from '../../stores/groupList'
import { groupPath } from '../../router/index'
import type { GroupWithStats } from './GroupListFilter.vue'

const props = defineProps<{
  groups: GroupWithStats[]
  selected: number[]
  canBulkTag: boolean
}>()

const router = useRouter()
const groupsStore = useGroupListStore()

const selectedGroups = computed(() => props.groups.filter(g => props.selected.includes(g.id)))

const selectedHours = computed(() =>
  Math.round(selectedGroups.value.reduce((sum, g) => sum + g.hours, 0) * 10) / 10)

const totalHours = computed(() =>
  Math.round(props.groups.reduce((sum, g) => sum + g.hours, 0) * 10) / 10)

function onDownload() {
  const today = new Date().toISOString().slice(0, 10)
  downloadCsv(`${today} Groups.csv`, ['Key', 'Name', 'Description', 'Regulars', 'Sessions', 'Hours'],
    selectedGroups.value.map(g => [g.key, g.displayName ?? '', g.description ?? '', g.regularsCount, g.sessionCount, g.hours])
  )
}

function onShare() {
  shareCurrentUrl()
}

const showNew = ref(false)
const saving = ref(false)
const saveError = ref('')

async function onAdd(data: AddGroupPayload) {
  saving.value = true
  saveError.value = ''
  try {
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      saveError.value = json.error || 'Failed to create group'
      return
    }
    const json = await res.json()
    showNew.value = false
    await groupsStore.fetch()
    if (json.data?.key) router.push(groupPath(json.data.key))
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : 'An error occurred'
    console.error('[GroupListActions] onAdd', e)
  } finally {
    saving.value = false
  }
}
</script>
