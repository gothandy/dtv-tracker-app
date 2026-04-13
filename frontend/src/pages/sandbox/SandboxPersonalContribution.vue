<template>
  <DefaultLayout>
    <div class="sandbox">
      <SandboxBackLink />
      <h1>PersonalContribution</h1>
      <p>This FY contribution facts panel. All stat combinations shown with static props.</p>

      <h2>Variants</h2>
      <div class="pc-grid">
        <div class="pc-item">
          <p class="pc-label">All facts present</p>
          <div class="pc-card">
            <PersonalContribution
              :sessions="10"
              :hours="57"
              :earned-card="true"
              :became-member="true"
            />
          </div>
        </div>
        <div class="pc-item">
          <p class="pc-label">Sessions + hours only</p>
          <div class="pc-card">
            <PersonalContribution
              :sessions="4"
              :hours="22.5"
              :earned-card="false"
              :became-member="false"
            />
          </div>
        </div>
        <div class="pc-item">
          <p class="pc-label">Sessions only (no hours)</p>
          <div class="pc-card">
            <PersonalContribution
              :sessions="2"
              :hours="0"
              :earned-card="false"
              :became-member="false"
            />
          </div>
        </div>
        <div class="pc-item">
          <p class="pc-label">Card only</p>
          <div class="pc-card">
            <PersonalContribution
              :sessions="0"
              :hours="0"
              :earned-card="true"
              :became-member="false"
            />
          </div>
        </div>
        <div class="pc-item">
          <p class="pc-label">Member only</p>
          <div class="pc-card">
            <PersonalContribution
              :sessions="0"
              :hours="0"
              :earned-card="false"
              :became-member="true"
            />
          </div>
        </div>
        <div class="pc-item">
          <p class="pc-label">All zeros — fallback line</p>
          <div class="pc-card">
            <PersonalContribution
              :sessions="0"
              :hours="0"
              :earned-card="false"
              :became-member="false"
            />
          </div>
        </div>
        <div class="pc-item">
          <p class="pc-label">Singular session + hour</p>
          <div class="pc-card">
            <PersonalContribution
              :sessions="1"
              :hours="1"
              :earned-card="false"
              :became-member="false"
            />
          </div>
        </div>
      </div>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import '../../styles/sandbox.css'
import { usePageTitle } from '../../composables/usePageTitle'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import SandboxBackLink from './SandboxBackLink.vue'
import PersonalContribution from '../../components/PersonalContribution.vue'

usePageTitle('Sandbox')
</script>

<style scoped>
.pc-grid  { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
.pc-item  { display: flex; flex-direction: column; gap: 0.25rem; }
.pc-label { font-size: 0.8rem; font-family: monospace; opacity: 0.6; margin: 0; }
.pc-card  { background: var(--color-dtv-sand-light); }
</style>
