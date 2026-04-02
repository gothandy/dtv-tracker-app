<template>
  <div class="dtv-modal-overlay" @click.self="emit('close')">
    <div class="dtv-modal">

      <div class="dtv-modal-header">
        <span class="dtv-modal-title">
          {{ entry?.volunteerName ?? '…' }}
          <span v-if="entry?.isMember && !entry?.isGroup" class="eem-badge">
            <img src="/svg/member.svg" alt="Member" class="svg-green" />
          </span>
        </span>
        <button class="dtv-modal-close" @click="emit('close')">×</button>
      </div>

      <div v-if="loading" class="eem-status">Loading…</div>
      <div v-else-if="loadError" class="eem-status eem-error">{{ loadError }}</div>

      <template v-else-if="entry">

        <div v-if="entry.volunteerSlug" class="eem-actions">
          <RouterLink :to="profilePath(entry.volunteerSlug)" class="eem-profile-link">
            View Profile
          </RouterLink>
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
              <img :src="'/svg/' + t.icon" :alt="t.alt" :class="t.color ? 'icon-' + t.color : ''" />
            </button>
          </div>
        </div>

        <div v-if="saveError" class="eem-error">{{ saveError }}</div>

        <div class="dtv-modal-footer">
          <button v-if="isAdmin" class="dtv-btn dtv-btn-danger" @click="confirmDelete = true">
            Delete
          </button>
          <button class="dtv-btn dtv-btn-primary" :disabled="saving" @click="save">
            {{ saving ? 'Saving…' : 'Save' }}
          </button>
        </div>

      </template>
    </div>
  </div>

  <div v-if="confirmDelete" class="dtv-modal-overlay" @click.self="confirmDelete = false">
    <div class="dtv-modal">
      <div class="dtv-modal-header">
        <span class="dtv-modal-title">Delete entry?</span>
        <button class="dtv-modal-close" @click="confirmDelete = false">×</button>
      </div>
      <div class="dtv-modal-footer">
        <button class="dtv-btn dtv-btn-danger" :disabled="deleting" @click="deleteEntry">
          {{ deleting ? 'Deleting…' : 'Delete' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useRole } from '../../composables/useRole'
import { profilePath } from '../../router/index'
import { TAG_ICONS } from '../../utils/tagIcons'

const props = defineProps<{ entryId: number }>()
const emit = defineEmits<{ close: []; saved: []; deleted: [] }>()

const { isAdmin } = useRole()

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

.eem-badge img { width: 1rem; height: 1rem; vertical-align: middle; }

.eem-actions { margin-bottom: 1.25rem; }

.eem-profile-link {
  color: var(--color-dtv-green);
  text-decoration: none;
  font-size: 0.9rem;
  border: 1px solid var(--color-dtv-green);
  padding: 0.3rem 0.75rem;
  display: inline-block;
}
.eem-profile-link:hover { opacity: 0.8; }

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
.eem-input:focus { outline: none; border-color: var(--color-dtv-green); }

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
.eem-textarea:focus { outline: none; border-color: var(--color-dtv-green); }

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
