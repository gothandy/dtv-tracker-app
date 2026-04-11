<template>
  <DefaultLayout>
    <div class="sandbox">

      <RouterLink to="/sandbox" class="back">← Sandbox</RouterLink>
      <h1>ProfileGroupItem</h1>

      <h2>Toggle allowed — idle, not regular</h2>
      <div class="demo">
        <ProfileGroupItem
          :group-id="1" group-key="sheepskull" group-name="Sheepskull"
          :hours="40" :is-regular="false" :allow-toggle-regular="true"
          @add-regular="log('addRegular')"
          @remove-regular="log('removeRegular')"
        />
      </div>

      <h2>Toggle allowed — idle, is regular</h2>
      <div class="demo">
        <ProfileGroupItem
          :group-id="1" group-key="sheepskull" group-name="Sheepskull"
          :hours="40" :is-regular="true" :regular-id="101" :allow-toggle-regular="true"
          @add-regular="log('addRegular')"
          @remove-regular="log('removeRegular')"
        />
      </div>

      <h2>Toggle allowed — working (in-flight)</h2>
      <div class="demo">
        <ProfileGroupItem
          :group-id="1" group-key="sheepskull" group-name="Sheepskull"
          :hours="40" :is-regular="true" :regular-id="101"
          :allow-toggle-regular="true" :working="true"
        />
      </div>

      <h2>Read-only — is regular</h2>
      <div class="demo">
        <ProfileGroupItem
          :group-id="1" group-key="sheepskull" group-name="Sheepskull"
          :hours="40" :is-regular="true" :regular-id="101"
        />
      </div>

      <h2>Read-only — not regular</h2>
      <div class="demo">
        <ProfileGroupItem
          :group-id="2" group-key="dig-deep" group-name="Dig Deep"
          :hours="6" :is-regular="false"
        />
      </div>

      <h2>Fractional hours</h2>
      <div class="demo">
        <ProfileGroupItem
          :group-id="3" group-key="riverside" group-name="Riverside Crew"
          :hours="7.5" :is-regular="false" :allow-toggle-regular="true"
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
import { usePageTitle } from '../../composables/usePageTitle'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import ProfileGroupItem from '../../components/profiles/ProfileGroupItem.vue'

usePageTitle('Sandbox')

const events = ref<string[]>([])

function log(msg: string) {
  events.value.unshift(msg)
}
</script>
