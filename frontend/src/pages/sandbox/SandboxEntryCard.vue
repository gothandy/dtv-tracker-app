<template>
  <DefaultLayout>
    <div class="sandbox">

      <SandboxBackLink />
      <h1>EntryCard</h1>
      <p class="sandbox-warning">Visual reference only — see <RouterLink to="/sandbox/entry-list">Entry List</RouterLink> for full functionality.</p>

      <h2>Operational — unchecked</h2>
      <div class="demo">
        <EntryCard
          title="Alice Bowen"
          :title-to="profilePath('alice-bowen-42')"
          :checked-in="false"
          :hours="0"
          :icons="[]"
          :allow-edit="true"
          :working="working1"
          @update="(c, h) => onUpdate(1, c, h)"
          @edit-entry="log('editEntry: Alice Bowen')"
        />
      </div>

      <h2>Operational — checked in, no hours</h2>
      <div class="demo">
        <EntryCard
          title="Bob Carter"
          :title-to="profilePath('bob-carter-7')"
          :checked-in="true"
          :hours="0"
          :icons="iconsForEntry({ isMember: true, cardStatus: 'Accepted', stats: { snapshot: { booking: 'New' } } })"
          :allow-edit="true"
          :working="working2"
          @update="(c, h) => onUpdate(2, c, h)"
          @edit-entry="log('editEntry: Bob Carter')"
        />
      </div>

      <h2>Operational — checked in with hours</h2>
      <div class="demo">
        <EntryCard
          title="Carol Davies"
          :title-to="profilePath('carol-davies-18')"
          :checked-in="true"
          :hours="3.5"
          :icons="iconsForEntry({ isMember: true, cardStatus: 'Invited', stats: { snapshot: { booking: 'Regular' }, manual: { digLead: true } } })"
          :allow-edit="true"
          :working="working3"
          @update="(c, h) => onUpdate(3, c, h)"
          @edit-entry="log('editEntry: Carol Davies')"
        />
      </div>

      <h2>Read-only</h2>
      <div class="demo">
        <EntryCard
          title="Alice Bowen"
          :title-to="profilePath('alice-bowen-42')"
          :checked-in="true"
          :hours="2"
          :icons="iconsForEntry({ isMember: false, stats: { snapshot: { booking: 'New' } } })"
        />
      </div>

      <h2>No slug — no link</h2>
      <div class="demo">
        <EntryCard
          title="Dean Heritage Volunteers Ltd"
          :checked-in="false"
          :hours="0"
          :icons="iconsForEntry({ isGroup: true })"
        />
      </div>

      <h2>Allow cancel</h2>
      <div class="demo">
        <EntryCard
          title="Alice Bowen"
          :title-to="profilePath('alice-bowen-42')"
          :checked-in="false"
          :hours="0"
          :icons="[]"
          :allow-cancel="true"
          @cancel="log('cancel: Alice Bowen')"
        />
      </div>

      <h2>Profile display (session as title)</h2>
      <div class="demo">
        <EntryCard
          title="2026-04-19 Sheepskull"
          :title-to="sessionPath('dhsc', '2026-04-19')"
          :checked-in="true"
          :hours="4"
          :icons="iconsForEntry({ stats: { snapshot: { booking: 'Regular' } } })"
        />
      </div>

      <h2>Event log</h2>
      <div class="event-log">
        <div v-if="!events.length" class="event-log-empty">No events yet.</div>
        <div v-for="(e, i) in events" :key="i">{{ e }}</div>
      </div>

    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import '../../styles/sandbox.css'
import { ref } from 'vue'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import SandboxBackLink from './SandboxBackLink.vue'
import EntryCard from '../../components/EntryCard.vue'
import { usePageTitle } from '../../composables/usePageTitle'
import { profilePath, sessionPath } from '../../router/index'
import { iconsForEntry } from '../../utils/tagIcons'

usePageTitle('Sandbox')

const working1 = ref(false)
const working2 = ref(false)
const working3 = ref(false)
const events = ref<string[]>([])

function log(msg: string) {
  events.value.unshift(msg)
}

async function onUpdate(id: number, checkedIn: boolean, hours: number) {
  if (id === 1) working1.value = true
  if (id === 2) working2.value = true
  if (id === 3) working3.value = true
  log(`update: id=${id} → saving…`)
  await new Promise(r => setTimeout(r, 2000))
  if (id === 1) working1.value = false
  if (id === 2) working2.value = false
  if (id === 3) working3.value = false
  log(`update: id=${id} → checkedIn=${checkedIn}, hours=${hours}`)
}
</script>

<style scoped>
.demo { border: 1px solid var(--color-border); padding: 0.5rem; }
</style>
