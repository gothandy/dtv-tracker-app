<template>
  <DefaultLayout>
    <div class="sandbox">

      <RouterLink to="/sandbox" class="back">← Sandbox</RouterLink>
      <h1>Form Components</h1>

      <!-- Textbox -->
      <h2>Textbox</h2>
      <FormLayout>
        <FormRow title="Name">
          <input class="sfc-input" value="Andrew Davies" />
        </FormRow>
        <FormRow title="Placeholder">
          <input class="sfc-input" placeholder="Search by name…" />
        </FormRow>
        <FormRow title="Disabled">
          <input class="sfc-input" value="gothandy@hotmail.com" disabled />
        </FormRow>
        <FormRow title="Multiline" :full-width="true">
          <textarea class="sfc-input sfc-input--multiline" rows="4">This is a longer note that spans multiple lines. It can contain descriptions, session write-ups, or any free-form text the user needs to enter.</textarea>
        </FormRow>
        <FormRow title="Multiline disabled" :full-width="true">
          <textarea class="sfc-input sfc-input--multiline" rows="4" disabled>This field is disabled.</textarea>
        </FormRow>
      </FormLayout>

      <!--Number -->
      <h2>Number</h2>
      <FormLayout>
        <FormRow title="Count">
          <input type="number" class="sfc-input sfc-input--narrow" value="3" min="0" />
        </FormRow>
        <FormRow title="Hours">
          <input type="number" class="sfc-input sfc-input--narrow" value="2.5" min="0" step="0.5" />
        </FormRow>
        <FormRow title="Disabled">
          <input type="number" class="sfc-input sfc-input--narrow" value="1" disabled />
        </FormRow>
      </FormLayout>

      <!--Checkbox -->
      <h2>Checkbox</h2>
      <FormLayout>
        <FormRow title="Unselected">
          <input type="checkbox" class="sfc-checkbox" />
        </FormRow>
        <FormRow title="Selected">
          <input type="checkbox" class="sfc-checkbox" checked />
        </FormRow>
        <FormRow title="Disabled">
          <input type="checkbox" class="sfc-checkbox" disabled />
        </FormRow>
        <FormRow title="Disabled checked">
          <input type="checkbox" class="sfc-checkbox" disabled checked />
        </FormRow>
      </FormLayout>

      <!--FY Filter -->
      <h2>FY Filter</h2>
      <FormLayout>
        <FormRow title="All">
          <FyFilter v-model="fyValue" />
        </FormRow>
        <FormRow title="Selected">
          <FyFilter v-model="fyValueSelected" />
        </FormRow>
        <FormRow title="Disabled">
          <FyFilter v-model="fyValue" disabled />
        </FormRow>
      </FormLayout>

      <!--Date Picker -->
      <h2>Date Picker</h2>
      <FormLayout>
        <FormRow title="Date">
          <input type="date" class="sfc-input" v-model="dateValue" />
        </FormRow>
        <FormRow title="Disabled">
          <input type="date" class="sfc-input" value="2026-04-05" disabled />
        </FormRow>
      </FormLayout>

      <!--Standard Dropdown -->
      <h2>Standard Dropdown</h2>
      <FormLayout>
        <FormRow title="Option">
          <select class="sfc-select">
            <option>Option A</option>
            <option>Option B</option>
            <option>Option C</option>
          </select>
        </FormRow>
        <FormRow title="Disabled">
          <select class="sfc-select" disabled>
            <option>Option A</option>
          </select>
        </FormRow>
      </FormLayout>

      <!--Group Dropdown -->
      <h2>Group Dropdown</h2>
      <FormLayout>
        <FormRow title="Group">
          <select class="sfc-select" v-model="selectedGroup">
            <option value="">All groups</option>
            <option v-for="g in groups" :key="g.key" :value="g.key">{{ g.name }}</option>
          </select>
        </FormRow>
        <FormRow title="Disabled">
          <select class="sfc-select" disabled>
            <option>All groups</option>
          </select>
        </FormRow>
      </FormLayout>

      <!--Tag Picker -->
      <h2>Tag Picker</h2>
      <FormLayout>
        <FormRow title="Unselected">
          <TagPicker v-model="tagValue" />
        </FormRow>
        <FormRow title="Selected">
          <TagPicker v-model="tagValueSelected" />
        </FormRow>
        <FormRow title="Disabled">
          <TagPicker v-model="tagValue" disabled />
        </FormRow>
      </FormLayout>

      <!--Entry Icon Picker -->
      <h2>Entry Icon Picker</h2>
      <FormLayout>
        <FormRow title="None selected" :full-width="true">
          <EntryTagPicker v-model="tagNotes" />
        </FormRow>
        <FormRow title="Some selected" :full-width="true">
          <EntryTagPicker v-model="tagNotesSelected" />
        </FormRow>
        <FormRow title="Disabled" :full-width="true">
          <EntryTagPicker v-model="tagNotesSelected" disabled />
        </FormRow>
      </FormLayout>

      <!--Profile Picker -->
      <h2>Profile Picker</h2>
      <FormLayout>
        <FormRow title="Profile" :full-width="true">
          <ProfilePicker :profiles="profiles" @select="onProfileSelect" />
        </FormRow>
        <FormRow title="Disabled" :full-width="true">
          <ProfilePicker :profiles="profiles" disabled />
        </FormRow>
      </FormLayout>

      <!-- FormLayout disabled -->
      <h2>FormLayout disabled</h2>
      <FormLayout disabled>
        <FormRow title="Name">
          <input class="sfc-input" value="Andrew Davies" />
        </FormRow>
        <FormRow title="Checked In">
          <input type="checkbox" class="sfc-checkbox" checked />
        </FormRow>
        <FormRow title="Notes" :full-width="true">
          <textarea class="sfc-input sfc-input--multiline" rows="3">Some notes here.</textarea>
        </FormRow>
        <FormRow title="FY Filter">
          <FyFilter v-model="fyValueSelected" />
        </FormRow>
        <FormRow title="Tag Picker">
          <TagPicker v-model="tagValueSelected" />
        </FormRow>
        <FormRow title="Entry Icon Picker" :full-width="true">
          <EntryTagPicker v-model="tagNotesSelected" />
        </FormRow>
        <FormRow title="Profile Picker" :full-width="true">
          <ProfilePicker :profiles="profiles" @select="onProfileSelect" />
        </FormRow>
      </FormLayout>

    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { usePageTitle } from '../../composables/usePageTitle'
usePageTitle('Sandbox')
import { ref } from 'vue'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'
import FyFilter from '../../components/FyFilter.vue'
import TagPicker from '../../components/TagPicker.vue'
import EntryTagPicker from '../../components/EntryTagPicker.vue'
import ProfilePicker, { type PickerProfile } from '../../components/ProfilePicker.vue'
import { useSessionsStore } from '../../stores/sessions'

const sessionsStore = useSessionsStore()
sessionsStore.fetch()

const fyValue = ref('all')
const fyValueSelected = ref('FY2024')

const dateValue = ref('2026-03-15')

const tagValue = ref('')
const tagValueSelected = ref('Sheepskull')

const tagNotes = ref('')
const tagNotesSelected = ref('#New #Regular')

const groups = ref([
  { key: 'sheepskull', name: 'Sheepskull' },
  { key: 'diglis', name: 'Diglis' },
  { key: 'adhoc', name: 'Ad Hoc' },
])
const selectedGroup = ref('')

const profiles = ref<PickerProfile[]>([
  { id: 1, name: 'Jane Smith', email: 'jane@example.com' },
  { id: 2, name: 'John Doe', email: 'john@example.com' },
  { id: 3, name: 'Alice Brown', email: 'alice@example.com' },
])
const selectedProfile = ref<PickerProfile | null>(null)

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

.sfc-input,
.sfc-select {
  width: 100%;
  background: var(--color-dtv-light);
  border: none;
  color: var(--color-text);
  padding: 0.3rem 0.5rem;
  font-family: inherit;
  font-size: 0.95rem;
  box-sizing: border-box;
}

.sfc-select { cursor: pointer; }
.sfc-input--narrow { width: 5rem; }
.sfc-input--multiline { resize: vertical; }

.sfc-checkbox {
  width: 1.5rem;
  height: 1.5rem;
  accent-color: var(--color-dtv-green);
  cursor: pointer;
  flex-shrink: 0;
}
</style>
