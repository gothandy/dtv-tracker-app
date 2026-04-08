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
    <FormLayout :disabled="adding">
      <FormRow title="Name" :full-width="true">
        <ProfilePicker
          ref="picker"
          :profiles="profiles"
          :add-new="addNew"
          :disabled="loadingProfiles"
          @select="onSelect"
        />
      </FormRow>

      <FormRow title="Email" :full-width="true">
        <input
          v-model="emailInput"
          class="aem-input"
          :disabled="!addNew"
          placeholder="email@example.com"
          type="email"
          autocomplete="off"
        />
      </FormRow>

      <FormRow title="Add New">
        <input type="checkbox" class="aem-checkbox" v-model="addNew" @change="onAddNewToggle" />
      </FormRow>
    </FormLayout>

    <div v-if="error" class="aem-error">{{ error }}</div>

  </ModalLayout>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import ModalLayout from '../../components/ModalLayout.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'
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

function onSelect(profile: PickerProfile | null) {
  selectedProfile.value = profile
}

function onAddNewToggle() {
  selectedProfile.value = null
  emailInput.value = ''
  if (!addNew.value) picker.value?.reset()
}

async function addEntry() {
  adding.value = true
  error.value = ''
  try {
    const body: Record<string, unknown> = { groupKey: props.groupKey, date: props.date }
    if (addNew.value) {
      body.newName = picker.value?.query ?? ''
      body.newEmail = emailInput.value
    } else {
      body.profileId = selectedProfile.value?.id
    }
    const res = await fetch(`/api/sessions/${encodeURIComponent(props.groupKey)}/${encodeURIComponent(props.date)}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Failed to add (${res.status})`)
    const json = await res.json()
    emit('added', json.data)
    resetForm()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to add entry'
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
.aem-error { color: var(--color-error); font-size: 0.85rem; margin-top: 0.5rem; }

.aem-input {
  width: 100%;
  background: var(--color-dtv-light);
  border: none;
  color: var(--color-text);
  padding: 0.3rem 0.5rem;
  font-family: inherit;
  font-size: 0.95rem;
  box-sizing: border-box;
}
.aem-input:disabled { color: var(--color-text-muted); }

.aem-checkbox {
  width: 1.5rem;
  height: 1.5rem;
  cursor: pointer;
}
</style>
