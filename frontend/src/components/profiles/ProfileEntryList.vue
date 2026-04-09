<template>
  <div class="pel-wrap">

    <div class="pel-header">
      <h2 class="pel-title">
        Sessions
        <span v-if="entries.length" class="pel-count">({{ entries.length }})</span>
      </h2>
    </div>

    <p v-if="!entries.length" class="pel-empty">No sessions yet.</p>

    <EntryList v-else>
      <EntryCard
        v-for="e in entries"
        :key="e.id"
        :title="cardTitle(e)"
        :title-to="profile?.isOperational ? undefined : sessionPath(e.session.groupKey, e.session.date)"
        :checked-in="e.checkedIn"
        :hours="e.hours"
        :icons="iconsForEntry({ ...e.profile, notes: e.notes }).filter(i => i.type !== 'badge')"
        :allow-edit="profile?.isOperational ?? false"
        :working="workingId === e.id"
        @update="(c, h) => emit('update', e, c, h)"
        @edit-entry="editingEntry = e"
      />
    </EntryList>

    <EditEntryModal
      v-if="editingEntry"
      :entry="editingEntry"
      :working="workingEdit"
      :error="editError"
      @close="closeEditModal"
      @save="onSave"
      @delete="onDelete"
    />

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { EntryItem } from '../../types/entry'
import type { RoleContext } from '../../composables/useProfile'
import EntryList from '../EntryList.vue'
import EntryCard from '../EntryCard.vue'
import EditEntryModal from '../../pages/modals/EditEntryModal.vue'
import { sessionPath } from '../../router/index'
import { iconsForEntry } from '../../utils/tagIcons'

type EditData = { checkedIn: boolean; count: number; hours: number; notes: string }

const props = defineProps<{
  entries: EntryItem[]
  profile?: RoleContext
  workingId?: number | null
}>()

const emit = defineEmits<{
  update: [entry: EntryItem, checkedIn: boolean, hours: number]
  editEntry: [id: number, data: EditData | null]
}>()

const editingEntry = ref<EntryItem | null>(null)
const workingEdit = ref(false)
const editError = ref('')

function cardTitle(e: EntryItem): string {
  const date = new Date(e.session.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${e.session.groupName} · ${date}`
}

function closeEditModal() {
  editingEntry.value = null
  workingEdit.value = false
  editError.value = ''
}

function onSave(data: EditData) {
  if (!editingEntry.value) return
  workingEdit.value = true
  editError.value = ''
  emit('editEntry', editingEntry.value.id, data)
}

function onDelete() {
  if (!editingEntry.value) return
  workingEdit.value = true
  editError.value = ''
  emit('editEntry', editingEntry.value.id, null)
}

defineExpose({
  onEditSuccess: closeEditModal,
  onEditError(msg: string) { workingEdit.value = false; editError.value = msg },
})
</script>

<style scoped>
.pel-wrap {
  padding: 1.5rem;
  background: var(--color-white);
  color: var(--color-text);
}

.pel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.pel-title {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0;
}

.pel-count {
  font-weight: 400;
  font-size: 1rem;
  color: var(--color-text-secondary);
}

.pel-empty {
  color: var(--color-text-secondary);
  margin: 0;
}
</style>
