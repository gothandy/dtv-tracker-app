<template>
  <DefaultLayout>
    <div class="sandbox">

      <SandboxBackLink />
      <h1>RegularItem</h1>

      <h2>Is regular — no accompanying adult</h2>
      <div class="demo">
        <RegularItem
          name="Sheepskull"
          :hours="40"
          :is-regular="true"
          :regular-id="101"
          @edit="log('edit: Sheepskull')"
        />
      </div>

      <h2>Is regular — has accompanying adult (child, dashed border)</h2>
      <div class="demo">
        <RegularItem
          name="Mini Digger"
          :hours="12"
          :is-regular="true"
          :regular-id="202"
          :accompanying-adult-id="101"
          @edit="log('edit: Mini Digger')"
        />
      </div>

      <h2>Not yet regular (no green border)</h2>
      <div class="demo">
        <RegularItem
          name="Dig Deep"
          :hours="6"
          :is-regular="false"
          @edit="log('edit: Dig Deep')"
        />
      </div>

      <h2>Working (in-flight)</h2>
      <div class="demo">
        <RegularItem
          name="Riverside Crew"
          :hours="7.5"
          :is-regular="true"
          :regular-id="303"
          :working="true"
        />
      </div>

      <h2>Fractional hours</h2>
      <div class="demo">
        <RegularItem
          name="Jane Smith"
          :hours="18.5"
          :is-regular="true"
          :regular-id="404"
          @edit="log('edit: Jane Smith')"
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
