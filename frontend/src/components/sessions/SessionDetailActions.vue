<template>
  <div class="sab-wrap">

    <!-- Upload Photos -->
    <button v-if="canUpload" class="sab-btn" @click="onUpload">Upload Photos</button>

    <!-- Edit Session -->
    <button v-if="isCheckIn || isAdmin" class="sab-btn" @click="showEdit = true">Edit Session</button>

    <!-- Entry picker modal for checkin/admin upload -->
    <div v-if="showPicker" class="dtv-modal-overlay" @click.self="showPicker = false">
      <div class="dtv-modal">
        <div class="dtv-modal-header">
          <span class="dtv-modal-title">Upload photos for…</span>
          <button class="dtv-modal-close" @click="showPicker = false">×</button>
        </div>
        <ul class="sab-entry-list">
          <li
            v-for="entry in session.entries"
            :key="entry.id"
            class="sab-entry-row"
            @click="goUpload(entry.id)"
          >
            <span>{{ entry.volunteerName ?? 'Unknown' }}</span>
            <span v-if="entry.checkedIn" class="sab-checked">✓</span>
          </li>
        </ul>
        <div class="dtv-modal-footer">
          <button class="dtv-btn" @click="showPicker = false">Cancel</button>
        </div>
      </div>
    </div>

    <EditSessionModal
      v-if="showEdit"
      :session="session"
      :group-key="groupKey"
      :date="date"
      @close="showEdit = false"
      @saved="onSaved"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useRole } from '../../composables/useRole'
import { sessionPath } from '../../router/index'
import type { SessionDetailResponse } from '../../../../types/api-responses'
import EditSessionModal from '../../pages/modals/EditSessionModal.vue'

const props = defineProps<{
  session: SessionDetailResponse
  groupKey: string
  date: string
}>()

const emit = defineEmits<{ saved: [groupKey: string, date: string] }>()

const router = useRouter()
const { isAdmin, isCheckIn, isSelfService } = useRole()

const showPicker = ref(false)
const showEdit = ref(false)

const canUpload = computed(() =>
  (isSelfService.value && !!props.session.userEntryId) ||
  isCheckIn.value ||
  isAdmin.value
)

function onUpload() {
  if (isSelfService.value && props.session.userEntryId) {
    window.location.href = `/upload.html?entryId=${props.session.userEntryId}`
    return
  }
  showPicker.value = true
}

function goUpload(entryId: number) {
  window.location.href = `/upload.html?entryId=${entryId}`
}

function onSaved(newGroupKey: string, newDate: string) {
  showEdit.value = false
  emit('saved', newGroupKey, newDate)
  // Navigate to updated URL if group/date changed
  if (newGroupKey !== props.groupKey || newDate !== props.date) {
    router.push(sessionPath(newGroupKey, newDate))
  }
}
</script>

<style scoped>
.sab-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: var(--color-surface-hover);
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

.sab-entry-list {
  list-style: none;
  padding: 0;
  margin: 0 0 0.5rem;
  max-height: 300px;
  overflow-y: auto;
}

.sab-entry-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0.75rem;
  cursor: pointer;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.9rem;
}
.sab-entry-row:hover { background: var(--color-surface-hover); }

.sab-checked { color: var(--color-dtv-green); font-weight: bold; }

.sab-btn {
  background: var(--color-dtv-green);
  color: var(--color-white);
  border: none;
  padding: 0.5rem 1rem;
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
}
.sab-btn:hover { background: var(--color-green-hover); }
</style>
