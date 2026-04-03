<template>
  <DefaultLayout>
    <div class="sandbox">

      <RouterLink to="/sandbox" class="back">← Sandbox</RouterLink>
      <h1>Form Components</h1>

      <!-- Textbox -->
      <h2>Textbox</h2>
      <div class="surface">
        <div class="field">
          <label class="label">Name</label>
          <input class="input" value="Andrew Davies" />
        </div>
        <div class="field">
          <label class="label">Placeholder</label>
          <input class="input" placeholder="Search by name…" />
        </div>
        <div class="field">
          <label class="label">Disabled</label>
          <input class="input" value="gothandy@hotmail.com" disabled />
        </div>
      </div>

      <!-- Number -->
      <h2>Number</h2>
      <div class="surface">
        <div class="field">
          <label class="label">Count</label>
          <input type="number" class="input input--narrow" value="3" min="0" />
        </div>
        <div class="field">
          <label class="label">Hours</label>
          <input type="number" class="input input--narrow" value="2.5" min="0" step="0.5" />
        </div>
        <div class="field">
          <label class="label">Disabled</label>
          <input type="number" class="input input--narrow" value="1" disabled />
        </div>
      </div>

      <!-- Checkbox -->
      <h2>Checkbox</h2>
      <div class="surface">
        <div class="field field--inline">
          <input type="checkbox" class="checkbox" />
          <label class="label">Unselected</label>
        </div>
        <div class="field field--inline">
          <input type="checkbox" class="checkbox" checked />
          <label class="label">Selected</label>
        </div>
        <div class="field field--inline">
          <input type="checkbox" class="checkbox" disabled />
          <label class="label">Disabled</label>
        </div>
        <div class="field field--inline">
          <input type="checkbox" class="checkbox" disabled checked />
          <label class="label">Disabled checked</label>
        </div>
      </div>

      <!-- Standard Dropdown -->
      <h2>Standard Dropdown</h2>
      <div class="surface">
        <div class="field">
          <label class="label">Option</label>
          <select class="select">
            <option>Option A</option>
            <option>Option B</option>
            <option>Option C</option>
          </select>
        </div>
        <div class="field">
          <label class="label">Disabled</label>
          <select class="select" disabled>
            <option>Option A</option>
          </select>
        </div>
      </div>

      <!-- Group Dropdown -->
      <h2>Group Dropdown</h2>
      <div class="surface">
        <div class="field">
          <label class="label">Group</label>
          <select class="select" v-model="selectedGroup">
            <option value="">All groups</option>
            <option v-for="g in groups" :key="g.key" :value="g.key">{{ g.name }}</option>
          </select>
        </div>
        <div class="field">
          <label class="label">Disabled</label>
          <select class="select" disabled>
            <option>All groups</option>
          </select>
        </div>
      </div>

      <!-- Tag Picker -->
      <h2>Tag Picker</h2>
      <div class="surface">
        <div class="field">
          <label class="label">Unselected</label>
          <TagPicker v-model="tagValue" />
        </div>
        <div class="field">
          <label class="label">Selected</label>
          <TagPicker v-model="tagValueSelected" />
        </div>
      </div>

      <!-- Entry Tag Picker -->
      <h2>Entry Tag Picker</h2>
      <div class="surface">
        <div class="field">
          <label class="label">None selected</label>
          <EntryTagPicker v-model="tagNotes" />
        </div>
        <div class="field">
          <label class="label">Some selected</label>
          <EntryTagPicker v-model="tagNotesSelected" />
        </div>
      </div>

      <!-- Profile Picker -->
      <h2>Profile Picker</h2>
      <div class="surface">
        <div class="field">
          <label class="label">Profile</label>
          <ProfilePicker :profiles="profiles" @select="onProfileSelect" />
        </div>
      </div>

    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import TagPicker from '../../components/TagPicker.vue'
import EntryTagPicker from '../../components/EntryTagPicker.vue'
import ProfilePicker, { type PickerProfile } from '../../components/ProfilePicker.vue'

const tagValue = ref('')
const tagValueSelected = ref('Sheepskull')

const tagNotes = ref('')
const tagNotesSelected = ref('#New #Regular')

const groups = ref<{ key: string; name: string }[]>([])
const selectedGroup = ref('')

const profiles = ref<PickerProfile[]>([])
const selectedProfile = ref<PickerProfile | null>(null)

onMounted(async () => {
  try {
    const [profilesRes, groupsRes] = await Promise.all([
      fetch('/api/profiles?fy=all'),
      fetch('/api/groups'),
    ])
    if (profilesRes.ok) {
      const json = await profilesRes.json()
      profiles.value = (json.data ?? []).map((p: any) => ({ id: p.id, name: p.name, email: p.email }))
    }
    if (groupsRes.ok) {
      const json = await groupsRes.json()
      groups.value = (json.data ?? []).map((g: any) => ({ key: g.key, name: g.displayName }))
    }
  } catch (e) {
    console.error('[SandboxFormComponents]', e)
  }
})

function onProfileSelect(p: PickerProfile) {
  selectedProfile.value = p
}
</script>

<style scoped>
.sandbox {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.back {
  color: var(--color-dtv-green);
  text-decoration: none;
  font-size: 0.9rem;
}
.back:hover { text-decoration: underline; }

h1 {
  font-size: 1.5rem;
  font-weight: 700;
  border-bottom: 2px solid var(--color-border);
  padding-bottom: 0.5rem;
  margin-bottom: 0.5rem;
}

h2 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.surface {
  background: var(--color-dtv-sand);
  padding: 0 1.5rem;
  display: flex;
  flex-direction: column;
}

/* Stacked: bold label above, full-width field below */
.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--color-border);
}
.field:last-child { border-bottom: none; }

/* Inline variant for checkbox rows */
.field--inline {
  flex-direction: row;
  align-items: center;
  gap: 0.75rem;
}

.label {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-text);
}

.input {
  width: 100%;
  background: var(--color-dtv-light);
  border: none;
  color: var(--color-text);
  padding: 0.45rem 0.6rem;
  font-family: inherit;
  font-size: 0.95rem;
  box-sizing: border-box;
}
.input--narrow { width: 5rem; }

.checkbox {
  width: 1.5rem;
  height: 1.5rem;
  accent-color: var(--color-dtv-green);
  cursor: pointer;
  flex-shrink: 0;
}

.select {
  width: 100%;
  background: var(--color-dtv-light);
  border: none;
  color: var(--color-text);
  padding: 0.45rem 0.6rem;
  font-family: inherit;
  font-size: 0.95rem;
  cursor: pointer;
  box-sizing: border-box;
}
.select:disabled { color: var(--color-text-muted); cursor: default; }
</style>
