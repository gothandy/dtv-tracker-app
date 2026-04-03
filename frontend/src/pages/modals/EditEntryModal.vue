<template>
  <ModalLayout
    :title="entry?.volunteerName ?? '…'"
    action="Save"
    action-icon="save"
    show-delete
    @close="emit('close')"
    @action="save"
    @delete="confirmDelete = true"
  >
    <div v-if="loading" class="eem-status">Loading…</div>
    <div v-else-if="loadError" class="eem-status eem-error">{{ loadError }}</div>

    <template v-else-if="entry">

      <div v-if="entry.volunteerSlug" class="eem-actions">
        <AppButton label="View Profile" icon="profile" @click="router.push(profilePath(entry.volunteerSlug!))" />
      </div>

      <div class="eem-field">
        <label class="eem-label">Checked In</label>
        <input type="checkbox" class="eem-checkbox" v-model="form.checkedIn" />
      </div>

      <div class="eem-field">
        <label class="eem-label">Count</label>
        <input type="number" class="eem-input" v-model.number="form.count" min="1" />
      </div>

      <div class="eem-field">
        <label class="eem-label">Hours</label>
        <input type="number" class="eem-input" v-model.number="form.hours" min="0" step="0.5" />
      </div>

      <div class="eem-field eem-field--notes">
        <label class="eem-label">Notes</label>
        <textarea class="eem-textarea" v-model="form.notes" rows="2" />
        <div class="eem-tags">
          <button
            v-for="t in tagButtons"
            :key="t.tag"
            class="eem-tag-btn"
            :class="{ active: hasTag(t.tag!) }"
            :title="t.alt"
            @click="toggleTag(t.tag!)"
          >
            <img :src="'/icons/' + t.icon" :alt="t.alt" :class="t.color ? 'icon-' + t.color : ''" />
          </button>
        </div>
      </div>

      <div v-if="saveError" class="eem-error">{{ saveError }}</div>

    </template>
  </ModalLayout>

  <ModalLayout
    v-if="confirmDelete"
    title="Delete entry?"
    action="Cancel"
    show-delete
    @close="confirmDelete = false"
    @action="confirmDelete = false"
    @delete="deleteEntry"
  />
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRole } from '../../composables/useRole'
import { profilePath } from '../../router/index'
import { TAG_ICONS } from '../../utils/tagIcons'
import ModalLayout from '../../components/ModalLayout.vue'
import AppButton from '../../components/AppButton.vue'

const props = defineProps<{ entryId: number }>()
const emit = defineEmits<{ close: []; saved: []; deleted: [] }>()

const { isAdmin } = useRole()
const router = useRouter()

interface EntryDetail {
  id: number
  volunteerName?: string
  volunteerSlug?: string
  isGroup: boolean
  isMember: boolean
  checkedIn: boolean
  count: number
  hours: number
  notes?: string
}

const entry = ref<EntryDetail | null>(null)
const loading = ref(false)
const loadError = ref('')
const saveError = ref('')
const saving = ref(false)
const confirmDelete = ref(false)
const deleting = ref(false)

const form = reactive({ checkedIn: false, count: 1, hours: 0, notes: '' })

const tagButtons = TAG_ICONS.filter(t => t.type === 'tag')
const notes = computed(() => form.notes)

function hasTag(tag: string): boolean {
  return new RegExp(tag, 'i').test(notes.value)
}

function toggleTag(tag: string) {
  if (hasTag(tag)) {
    form.notes = form.notes.replace(new RegExp('\\s*' + tag, 'gi'), '').trim()
  } else {
    form.notes = form.notes ? form.notes.trimEnd() + ' ' + tag : tag
  }
}

onMounted(async () => {
  loading.value = true
  try {
    const res = await fetch(`/api/entries/${props.entryId}`)
    if (!res.ok) throw new Error(`Failed to load (${res.status})`)
    const json = await res.json()
    entry.value = json.data
    form.checkedIn = json.data.checkedIn
    form.count = json.data.count
    form.hours = json.data.hours
    form.notes = json.data.notes ?? ''
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Load failed'
  } finally {
    loading.value = false
  }
})

async function save() {
  saving.value = true
  saveError.value = ''
  try {
    const res = await fetch(`/api/entries/${props.entryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkedIn: form.checkedIn, count: form.count, hours: form.hours, notes: form.notes }),
    })
    if (!res.ok) throw new Error(`Save failed (${res.status})`)
    emit('saved')
    emit('close')
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : 'Save failed'
  } finally {
    saving.value = false
  }
}

async function deleteEntry() {
  deleting.value = true
  try {
    const res = await fetch(`/api/entries/${props.entryId}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(`Delete failed (${res.status})`)
    emit('deleted')
    emit('close')
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : 'Delete failed'
    confirmDelete.value = false
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.eem-status { font-size: 0.9rem; color: var(--color-text-muted); margin-bottom: 1rem; }
.eem-error { color: var(--color-error); }

.eem-actions { margin-bottom: 1.25rem; }

.eem-field {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--color-border);
}
.eem-field--notes { align-items: flex-start; flex-direction: column; gap: 0.5rem; }

.eem-label { font-size: 0.85rem; color: var(--color-text-label); min-width: 5rem; }

.eem-input {
  width: 5rem;
  background: var(--color-white);
  border: 2px solid var(--color-border);
  color: var(--color-text);
  padding: 0.3rem 0.5rem;
  font-family: inherit;
  font-size: 0.95rem;
}

.eem-checkbox {
  width: 1.5rem;
  height: 1.5rem;
  accent-color: var(--color-dtv-green);
  cursor: pointer;
}

.eem-textarea {
  width: 100%;
  background: var(--color-white);
  border: 2px solid var(--color-border);
  color: var(--color-text);
  padding: 0.4rem 0.5rem;
  font-family: inherit;
  font-size: 0.9rem;
  resize: vertical;
  box-sizing: border-box;
}

.eem-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; }

.eem-tag-btn {
  width: 2.5rem;
  height: 2.5rem;
  background: var(--color-surface-hover);
  border: 1px solid var(--color-border);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.4rem;
}
.eem-tag-btn:hover { background: var(--color-surface-subtle); }
.eem-tag-btn.active { border-color: var(--color-dtv-green); background: var(--color-green-tint); }
.eem-tag-btn img { width: 1.25rem; height: 1.25rem; object-fit: contain; }
</style>
