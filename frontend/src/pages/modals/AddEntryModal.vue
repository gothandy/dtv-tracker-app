<template>
  <ModalLayout
    title="Add Entry"
    action="Add"
    action-icon="new"
    :action-disabled="!canAdd"
    :working="adding"
    @close="emit('close')"
    @action="addEntry"
  >
    <div v-if="loadingProfiles" class="aem-status">Loading…</div>

    <template v-else>

      <div class="aem-field">
        <label class="aem-label">Name</label>
        <ProfilePicker
          ref="picker"
          :profiles="profiles"
          :add-new="addNew"
          @select="onSelect"
        />
      </div>

      <div class="aem-field">
        <label class="aem-label">Email</label>
        <input
          v-model="emailInput"
          class="aem-input"
          :disabled="!addNew"
          placeholder="email@example.com"
          type="email"
          autocomplete="off"
        />
      </div>

      <div class="aem-field">
        <label class="aem-label">Add New</label>
        <input type="checkbox" class="aem-checkbox" v-model="addNew" @change="onAddNewToggle" />
      </div>

      <div v-if="error" class="aem-error">{{ error }}</div>

    </template>
  </ModalLayout>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import ModalLayout from '../../components/ModalLayout.vue'
import ProfilePicker, { type PickerProfile } from '../../components/ProfilePicker.vue'
import type { EntryResponse } from '../../../../types/api-responses'

const props = defineProps<{ groupKey: string; date: string }>()
const emit = defineEmits<{ close: []; added: [entry: EntryResponse] }>()

const picker = ref<InstanceType<typeof ProfilePicker> | null>(null)
const profiles = ref<PickerProfile[]>([])
const loadingProfiles = ref(false)
const adding = ref(false)
const error = ref('')

const selectedProfile = ref<PickerProfile | null>(null)
const addNew = ref(false)
const emailInput = ref('')

const canAdd = ref(false)

watch([selectedProfile, addNew], () => {
  canAdd.value = selectedProfile.value !== null || addNew.value
})

onMounted(async () => {
  loadingProfiles.value = true
  try {
    const res = await fetch('/api/profiles?fy=all')
    if (!res.ok) throw new Error(`Failed to load profiles (${res.status})`)
    const json = await res.json()
    profiles.value = (json.data ?? []).map((p: any) => ({ id: p.id, name: p.name, email: p.email }))
  } catch (e) {
    console.error('[AddEntryModal]', e)
  } finally {
    loadingProfiles.value = false
  }
})

function onSelect(profile: PickerProfile) {
  selectedProfile.value = profile
  emailInput.value = profile.email ?? ''
}


function onAddNewToggle() {
  selectedProfile.value = null
  emailInput.value = ''
}

async function addEntry() {
  error.value = ''
  adding.value = true
  try {
    let volunteerId: number

    if (addNew.value) {
      const body: Record<string, string> = { name: picker.value?.query ?? '' }
      if (emailInput.value.trim()) body.email = emailInput.value.trim()
      const createRes = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!createRes.ok) throw new Error(`Create profile failed (${createRes.status})`)
      const created = await createRes.json()
      volunteerId = created.data.id
      profiles.value.push({ id: volunteerId, name: created.data.name, email: created.data.email })
    } else {
      volunteerId = selectedProfile.value!.id
    }

    const entryRes = await fetch(`/api/sessions/${props.groupKey}/${props.date}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ volunteerId }),
    })
    if (!entryRes.ok) throw new Error(`Add entry failed (${entryRes.status})`)
    const json = await entryRes.json()
    emit('added', json.data)
    resetForm()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Add failed'
  } finally {
    adding.value = false
  }
}

function resetForm() {
  selectedProfile.value = null
  addNew.value = false
  emailInput.value = ''
  error.value = ''
  picker.value?.reset()
}
</script>

<style scoped>
.aem-status { font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 1rem; }
.aem-error { color: var(--color-error); font-size: 0.85rem; margin-top: 0.5rem; }

.aem-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--color-border);
}
.aem-field:last-of-type { border-bottom: none; }

@media (min-width: 420px) {
  .aem-field {
    flex-direction: row;
    align-items: center;
    gap: 1rem;
  }
}

.aem-label { font-size: 0.85rem; color: var(--color-text-label); min-width: 5rem; flex-shrink: 0; }

.aem-input {
  flex: 1;
  background: var(--color-dtv-light);
  border: none;
  color: var(--color-text);
  padding: 0.3rem 0.5rem;
  font-family: inherit;
  font-size: 0.95rem;
}
.aem-input:disabled { color: var(--color-text-muted); }

.aem-checkbox {
  width: 1.5rem;
  height: 1.5rem;
  accent-color: var(--color-dtv-green);
  cursor: pointer;
}
</style>
