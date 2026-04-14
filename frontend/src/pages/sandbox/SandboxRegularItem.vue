<template>
  <DefaultLayout>
    <div class="sandbox">

      <SandboxBackLink />
      <h1>RegularItem</h1>

      <h2>Toggle allowed — idle, not regular</h2>
      <div class="demo">
        <RegularItem
          name="Sheepskull"
          link-to="/groups/sheepskull"
          :hours="40"
          :is-regular="false"
          :allow-toggle-regular="true"
          @add-regular="log('addRegular')"
          @remove-regular="log('removeRegular')"
        />
      </div>

      <h2>Toggle allowed — idle, is regular</h2>
      <div class="demo">
        <RegularItem
          name="Sheepskull"
          link-to="/groups/sheepskull"
          :hours="40"
          :is-regular="true"
          :regular-id="101"
          :allow-toggle-regular="true"
          @add-regular="log('addRegular')"
          @remove-regular="log('removeRegular')"
        />
      </div>

      <h2>Toggle allowed — working (in-flight)</h2>
      <div class="demo">
        <RegularItem
          name="Sheepskull"
          link-to="/groups/sheepskull"
          :hours="40"
          :is-regular="true"
          :regular-id="101"
          :allow-toggle-regular="true"
          :working="true"
        />
      </div>

      <h2>Read-only — is regular</h2>
      <div class="demo">
        <RegularItem
          name="Sheepskull"
          link-to="/groups/sheepskull"
          :hours="40"
          :is-regular="true"
          :regular-id="101"
        />
      </div>

      <h2>Read-only — not regular</h2>
      <div class="demo">
        <RegularItem
          name="Dig Deep"
          link-to="/groups/dig-deep"
          :hours="6"
          :is-regular="false"
        />
      </div>

      <h2>Fractional hours</h2>
      <div class="demo">
        <RegularItem
          name="Riverside Crew"
          link-to="/groups/riverside"
          :hours="7.5"
          :is-regular="false"
          :allow-toggle-regular="true"
        />
      </div>

      <h2>Profile context (name is a volunteer)</h2>
      <div class="demo">
        <RegularItem
          name="Jane Smith"
          link-to="/profiles/jane-smith-42"
          :hours="18"
          :is-regular="true"
          :regular-id="202"
          :allow-toggle-regular="true"
          @add-regular="log('addRegular')"
          @remove-regular="log('removeRegular')"
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
import SandboxBackLink from './SandboxBackLink.vue'
import RegularItem from '../../components/RegularItem.vue'

usePageTitle('Sandbox')

const events = ref<string[]>([])

function log(msg: string) {
  events.value.unshift(msg)
}
</script>
