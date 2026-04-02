<template>
  <div class="dtv-modal-overlay" @click.self="emit('close')">
    <div class="dtv-modal">
      <div class="dtv-modal-header">
        <span class="dtv-modal-title">Add Entry</span>
        <button class="dtv-modal-close" @click="emit('close')">×</button>
      </div>

      <div class="dtv-field">
        <label class="dtv-label">Search volunteer</label>
        <div v-if="loadingProfiles" class="aem-status">Loading…</div>
        <ProfilePicker
          v-else
          ref="picker"
          :profiles="profiles"
          @select="addEntry"
        />
      </div>

      <div v-if="adding" class="aem-status">Adding…</div>
      <div v-if="error" class="aem-error">{{ error }}</div>

      <div class="dtv-modal-footer">
        <button class="dtv-btn" @click="emit('close')">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import ProfilePicker, { type PickerProfile } from '../../components/ProfilePicker.vue'
import type { EntryResponse } from '../../../../types/api-responses'

const props = defineProps<{ groupKey: string; date: string }>()
const emit = defineEmits<{ close: []; added: [entry: EntryResponse] }>()

const picker = ref<InstanceType<typeof ProfilePicker> | null>(null)
const profiles = ref<PickerProfile[]>([])
const loadingProfiles = ref(false)
const adding = ref(false)
const error = ref('')

onMounted(async () => {
  loadingProfiles.value = true
  try {
    const res = await fetch('/api/profiles?fy=all')
    if (!res.ok) throw new Error(`Failed to load profiles (${res.status})`)
    const json = await res.json()
    profiles.value = (json.data ?? []).map((p: any) => ({ id: p.id, name: p.name }))
  } catch (e) {
    console.error('[AddEntryModalV1]', e)
  } finally {
    loadingProfiles.value = false
  }
})

async function addEntry(profile: PickerProfile) {
  adding.value = true
  error.value = ''
  try {
    const res = await fetch(`/api/sessions/${props.groupKey}/${props.date}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ volunteerId: profile.id }),
    })
    if (!res.ok) throw new Error(`Add failed (${res.status})`)
    const json = await res.json()
    emit('added', json.data)
    emit('close')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Add failed'
  } finally {
    adding.value = false
  }
}
</script>

<style scoped>
.aem-status { font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 1rem; }
.aem-error { color: var(--color-error); font-size: 0.85rem; margin-top: 0.5rem; }
</style>
