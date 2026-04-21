<template>
  <ModalLayout
    :title="title ?? entry.profile.name"
    action="Save"
    action-icon="save"
    :show-delete="isAdmin"
    delete-text="Delete"
    :working="working"
    :error="error"
    @close="emit('close')"
    @action="save"
    @delete="confirmDelete = true"
  >
    <div v-if="entry.cancelled" class="eem-cancelled">
      Cancelled {{ formatCancelled(entry.cancelled) }}
    </div>

    <div v-if="profileClick || sessionClick" class="eem-actions">
      <AppButton v-if="profileClick" label="View Profile" icon="profile" @click="profileClick!()" />
      <AppButton v-if="sessionClick" label="View Session" icon="register" @click="sessionClick!()" />
    </div>

    <div v-if="entryIcons.length" class="eem-icon-summary">
      <div v-for="icon in entryIcons" :key="icon.alt" class="eem-icon-summary-item" :class="{ 'eem-icon-summary-item--subdued': icon.subdued }">
        <span class="eem-icon-summary-icon" :class="icon.color ? 'icon-' + icon.color : ''">
          <img :src="'/icons/' + icon.icon" :alt="icon.alt" />
        </span>
        <span>{{ icon.alt }}</span>
      </div>
    </div>

    <FormLayout :disabled="working">
      <FormRow title="Tags" :full-width="true">
        <div class="eem-tags">
          <AppButton
            :label="(childMode ? 'Unset' : 'Set') + ' Child'"
            icon="badges/child"
            mode="icon-only"
            :variant="childMode ? 'primary' : 'subtle'"
            :selected="childMode"
            :disabled="working"
            @click="toggleChild"
          />
          <EntryIconPicker v-model="form.statsManual" :snapshot="entry.stats?.snapshot" :disabled="working" />
        </div>
        <p v-if="childValidationError" class="eem-validation">Select an accompanying adult or deselect Child.</p>
      </FormRow>

      <FormRow v-if="sessionAdults" title="Accompanying Adult">
        <select
          class="eem-select"
          :class="{ 'eem-select--placeholder': form.accompanyingAdultId === null }"
          :disabled="!childMode || working"
          v-model="form.accompanyingAdultId"
        >
          <option :value="null">Select adult…</option>
          <option v-for="a in sessionAdults" :key="a.id" :value="a.id">{{ a.name }}</option>
        </select>
        <p v-if="accompanyingAdultMissing" class="eem-adult-warning">Not registered at this session</p>
      </FormRow>

      <FormRow v-if="entry.profile.isGroup" title="Count">
        <input type="number" class="eem-input" v-model.number="form.count" min="1" />
      </FormRow>

      <FormRow title="Checked In">
        <input type="checkbox" class="eem-checkbox" v-model="form.checkedIn" />
      </FormRow>

      <FormRow title="Hours" :disabled="!form.checkedIn">
        <input type="number" class="eem-input" v-model.number="form.hours" min="0" step="0.5" :disabled="!form.checkedIn" />
      </FormRow>

      <FormRow title="Cancel Booking">
        <input type="checkbox" class="eem-checkbox" v-model="form.cancelled" />
      </FormRow>

      <!-- Notes hidden during #189 testing — restore once tags migration complete and notes UX tidied -->
      <!-- <FormRow title="Notes" :full-width="true">
        <textarea class="eem-textarea" v-model="form.notes" rows="2" />
      </FormRow> -->
    </FormLayout>
  </ModalLayout>

  <DeleteModal
    v-if="confirmDelete"
    title="Delete entry?"
    @close="confirmDelete = false"
    @confirm="deleteEntry"
  />
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import type { EntryItem } from '../../types/entry'
import type { EntryStatsManual } from '../../../../types/entry-stats'
import ModalLayout from '../../components/ModalLayout.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'
import AppButton from '../../components/AppButton.vue'
import EntryIconPicker from '../../components/EntryIconPicker.vue'
import DeleteModal from './DeleteModal.vue'
import { iconsForEntry } from '../../utils/tagIcons'

const props = defineProps<{
  entry: EntryItem
  working: boolean
  error?: string
  title?: string
  isAdmin?: boolean
  profileClick?: () => void
  sessionClick?: () => void
  sessionAdults?: { id: number; name: string }[]
}>()

const emit = defineEmits<{
  close: []
  save: [data: { checkedIn: boolean; count: number; hours: number; notes: string; accompanyingAdultId: number | null; statsManual: EntryStatsManual; cancelled: boolean }]
  delete: []
}>()

const confirmDelete = ref(false)
const childValidationError = ref(false)

const childMode = ref(props.entry.accompanyingAdultId !== null && props.entry.accompanyingAdultId !== undefined)

const form = reactive({
  checkedIn: props.entry.checkedIn,
  count: props.entry.count,
  hours: props.entry.hours,
  notes: props.entry.notes ?? '',
  statsManual: { ...props.entry.stats?.manual } as EntryStatsManual,
  accompanyingAdultId: props.entry.accompanyingAdultId ?? null as number | null,
  cancelled: !!props.entry.cancelled,
})

const accompanyingAdultMissing = computed(() =>
  form.accompanyingAdultId !== null &&
  !props.sessionAdults?.some(a => a.id == form.accompanyingAdultId)
)

const entryIcons = computed(() => iconsForEntry({
  isMember: props.entry.profile.isMember,
  isGroup: props.entry.profile.isGroup,
  cardStatus: props.entry.profile.cardStatus,
  stats: {
    ...props.entry.stats,
    snapshot: { ...props.entry.stats?.snapshot, isChild: form.accompanyingAdultId !== null },
    manual: form.statsManual,
  },
}))

watch(() => props.entry, (e) => {
  form.checkedIn = e.checkedIn
  form.count = e.count
  form.hours = e.hours
  form.notes = e.notes ?? ''
  form.statsManual = { ...e.stats?.manual }
  form.accompanyingAdultId = e.accompanyingAdultId ?? null
  form.cancelled = !!e.cancelled
  childMode.value = e.accompanyingAdultId !== null && e.accompanyingAdultId !== undefined
  childValidationError.value = false
})

function toggleChild() {
  if (childMode.value) {
    childMode.value = false
    form.accompanyingAdultId = null
    childValidationError.value = false
  } else {
    childMode.value = true
  }
}

function formatCancelled(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function save() {
  if (childMode.value && form.accompanyingAdultId === null) {
    childValidationError.value = true
    return
  }
  childValidationError.value = false
  emit('save', {
    checkedIn: form.checkedIn,
    count: form.count,
    hours: form.hours,
    notes: form.notes,
    accompanyingAdultId: form.accompanyingAdultId,
    statsManual: form.statsManual,
    cancelled: form.cancelled,
  })
}

function deleteEntry() {
  confirmDelete.value = false
  emit('delete')
}
</script>

<style scoped>
.eem-cancelled {
  background: var(--color-dtv-dirt-light);
  color: var(--color-dtv-dirt-dark, var(--color-dtv-dirt));
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 1.25rem;
}

.eem-actions {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}

.eem-input {
  width: 5rem;
  background: var(--color-dtv-light);
  border: none;
  color: var(--color-text);
  padding: 0.3rem 0.5rem;
  font-family: inherit;
  font-size: 0.95rem;
}

.eem-checkbox {
  width: 1.5rem;
  height: 1.5rem;
  cursor: pointer;
}

.eem-textarea {
  width: 100%;
  background: var(--color-dtv-light);
  border: none;
  color: var(--color-text);
  padding: 0.4rem 0.5rem;
  font-family: inherit;
  font-size: 0.9rem;
  resize: vertical;
  box-sizing: border-box;
}

.eem-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.4rem;
}

.eem-select {
  width: 100%;
  background: var(--color-dtv-light);
  border: none;
  color: var(--color-text);
  padding: 0.3rem 0.5rem;
  font-family: inherit;
  font-size: 0.95rem;
  box-sizing: border-box;
}
.eem-select:disabled { color: var(--color-text-muted); }
.eem-select--placeholder { color: var(--color-text-muted); }

.eem-adult-warning {
  margin-top: 0.25rem;
  font-size: 0.8rem;
  color: var(--color-dtv-dirt);
}

.eem-validation {
  margin-top: 0.25rem;
  font-size: 0.8rem;
  color: var(--color-dtv-dirt);
}

.eem-icon-summary {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 1.25rem;
}

.eem-icon-summary-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.eem-icon-summary-icon {
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.eem-icon-summary-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.eem-icon-summary-item--subdued { color: var(--color-dtv-sand-dark); }
.eem-icon-summary-item--subdued .eem-icon-summary-icon img { opacity: 0.4; }
</style>
