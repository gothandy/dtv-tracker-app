<template>
  <DefaultLayout>
    <div class="sandbox">

      <SandboxBackLink />
      <h1>Entry Icon Picker</h1>

      <!-- ─── Buttons only ─── -->

      <h2>Buttons only (no summary)</h2>

      <FormLayout>
        <FormRow title="Empty" :full-width="true">
          <EntryIconPicker v-model="empty" :is-child="false" @toggle-child="() => {}" />
        </FormRow>

        <FormRow title="Child selected" :full-width="true">
          <EntryIconPicker v-model="empty" :is-child="true" @toggle-child="() => {}" />
        </FormRow>

        <FormRow title="DigLead + CSR" :full-width="true">
          <EntryIconPicker v-model="someLabels" :is-child="false" @toggle-child="() => {}" />
        </FormRow>

        <FormRow title="All labels + child" :full-width="true">
          <EntryIconPicker v-model="allLabels" :is-child="true" @toggle-child="() => {}" />
        </FormRow>

        <FormRow title="Disabled" :full-width="true">
          <EntryIconPicker v-model="someLabels" :is-child="true" disabled @toggle-child="() => {}" />
        </FormRow>
      </FormLayout>

      <!-- ─── Summary: profile badges ─── -->

      <h2>Summary — profile badges</h2>

      <FormLayout>
        <FormRow title="Member + Card" :full-width="true">
          <EntryIconPicker v-model="empty" :summary="summaryMemberCard" :is-child="false" @toggle-child="() => {}" />
        </FormRow>

        <FormRow title="Card Invited" :full-width="true">
          <EntryIconPicker v-model="empty" :summary="summaryCardInvited" :is-child="false" @toggle-child="() => {}" />
        </FormRow>

        <FormRow title="Group + Warning" :full-width="true">
          <EntryIconPicker v-model="empty" :summary="summaryGroupWarning" :is-child="false" @toggle-child="() => {}" />
        </FormRow>
      </FormLayout>

      <!-- ─── Summary: entry context ─── -->

      <h2>Summary — entry context</h2>

      <FormLayout>
        <FormRow title="New + No Photo" :full-width="true">
          <EntryIconPicker v-model="empty" :summary="summaryNewNoPhoto" :is-child="false" @toggle-child="() => {}" />
        </FormRow>

        <FormRow title="Child + Eventbrite" :full-width="true">
          <EntryIconPicker v-model="empty" :summary="summaryChildEventbrite" :is-child="true" @toggle-child="() => {}" />
        </FormRow>

        <FormRow title="Regular" :full-width="true">
          <EntryIconPicker v-model="regularLabel" :summary="summaryRegular" :is-child="false" @toggle-child="() => {}" />
        </FormRow>
      </FormLayout>

      <!-- ─── Summary: First Aider states ─── -->

      <h2>Summary — First Aider</h2>

      <FormLayout>
        <FormRow title="Certified (not on duty)" :full-width="true">
          <EntryIconPicker v-model="empty" :summary="summaryFaCertified" :is-child="false" @toggle-child="() => {}" />
        </FormRow>

        <FormRow title="On Duty (label set)" :full-width="true">
          <EntryIconPicker v-model="faOnDutyLabel" :summary="summaryFaOnDuty" :is-child="false" @toggle-child="() => {}" />
        </FormRow>

        <FormRow title="No cert, not on duty" :full-width="true">
          <EntryIconPicker v-model="empty" :summary="summaryFaNone" :is-child="false" @toggle-child="() => {}" />
        </FormRow>
      </FormLayout>

      <!-- ─── Kitchen sink ─── -->

      <h2>All icons + all labels</h2>

      <FormLayout>
        <FormRow title="Full state" :full-width="true">
          <EntryIconPicker v-model="allLabels" :summary="summaryKitchenSink" :is-child="true" @toggle-child="() => {}" />
        </FormRow>
      </FormLayout>

      <!-- ─── Interactive ─── -->

      <h2>Interactive</h2>
      <p class="sip-state">Labels: {{ interactiveLabels.join(', ') || 'none' }} | Child: {{ interactiveChild }}</p>

      <FormLayout>
        <FormRow title="Live" :full-width="true">
          <EntryIconPicker
            v-model="interactiveLabels"
            :summary="interactiveSummary"
            :is-child="interactiveChild"
            @toggle-child="interactiveChild = !interactiveChild"
          />
        </FormRow>
      </FormLayout>

    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import '../../styles/sandbox.css'
import { usePageTitle } from '../../composables/usePageTitle'
usePageTitle('Sandbox — Entry Icon Picker')
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import SandboxBackLink from './SandboxBackLink.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'
import EntryIconPicker from '../../components/EntryIconPicker.vue'
import { iconsForEntry } from '../../utils/labelIcons'

// ─── Reactive labels for interactive rows ───────────────────────────────────

const empty          = ref<string[]>([])
const someLabels     = ref<string[]>(['DigLead', 'CSR'])
const allLabels      = ref<string[]>(['Regular', 'FirstAider', 'DigLead', 'CSR', 'Late'])
const regularLabel   = ref<string[]>(['Regular'])
const faOnDutyLabel  = ref<string[]>(['FirstAider'])

// ─── Static summaries ───────────────────────────────────────────────────────

const summaryMemberCard    = iconsForEntry({ isMember: true, cardStatus: 'Accepted' })
const summaryCardInvited   = iconsForEntry({ isMember: true, cardStatus: 'Invited' })
const summaryGroupWarning  = iconsForEntry({ isGroup: true, hasProfileWarning: true })
const summaryNewNoPhoto    = iconsForEntry({ isNew: true, noPhoto: true })
const summaryChildEventbrite = iconsForEntry({ isChild: true, eventbriteAttendeeId: 'eb-12345' })
const summaryRegular       = iconsForEntry({ labels: ['Regular'] })
const summaryFaCertified   = iconsForEntry({ isFirstAiderAvailable: true })
const summaryFaOnDuty      = iconsForEntry({ labels: ['FirstAider'] })
const summaryFaNone        = iconsForEntry({})
const summaryKitchenSink   = iconsForEntry({
  isMember: true,
  cardStatus: 'Accepted',
  hasProfileWarning: true,
  isNew: true,
  noPhoto: true,
  isChild: true,
  eventbriteAttendeeId: 'eb-12345',
  isFirstAiderAvailable: true,
  labels: ['Regular', 'FirstAider', 'DigLead', 'CSR', 'Late'],
})

// ─── Interactive ────────────────────────────────────────────────────────────

const interactiveLabels = ref<string[]>(['DigLead'])
const interactiveChild  = ref(false)

const interactiveSummary = computed(() => iconsForEntry({
  isMember: true,
  cardStatus: 'Accepted',
  isNew: true,
  noPhoto: false,
  isFirstAiderAvailable: true,
  isChild: interactiveChild.value,
  labels: interactiveLabels.value,
}))
</script>

<style scoped>
.sip-state {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  font-family: monospace;
  margin: 0 0 0.5rem;
}
</style>
