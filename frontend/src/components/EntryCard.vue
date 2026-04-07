<template>
  <div class="ec-row">

    <!-- Check/hours control (both variants) -->
    <!-- State 1: unchecked → click checks in -->
    <!-- State 2: checked, no hours → shows ✓, click opens hours input -->
    <!-- State 3: hours input → clear to empty to revert to ✓ -->
    <template v-if="allowEdit">
      <div v-if="working && (showHours || entry.hours > 0)" class="ec-check ec-check--on">
        <span class="ec-spinner ec-spinner--white" />
      </div>
      <input
        v-else-if="showHours || entry.hours > 0"
        ref="hoursInput"
        type="number"
        class="ec-check ec-check--hours"
        :value="entry.hours > 0 ? entry.hours : 3"
        min="0"
        step="0.5"
        @blur="onHoursChange(entry, ($event.target as HTMLInputElement))"
        @keydown.enter.prevent="onHoursChange(entry, ($event.target as HTMLInputElement))"
      />
      <button
        v-else
        class="ec-check"
        :class="{ 'ec-check--on': entry.checkedIn, 'ec-check--working': working }"
        @click="onCheckClick(entry)"
      >
        <span v-if="working" class="ec-spinner" />
        <span v-else-if="entry.checkedIn">✓</span>
      </button>
    </template>
    <div v-else-if="entry.hours > 0" class="ec-check ec-check--hours-static">
      {{ entry.hours }}h
    </div>
    <div v-else class="ec-check ec-check--static" :class="{ 'ec-check--on': entry.checkedIn }">
      <span v-if="entry.checkedIn">✓</span>
    </div>

    <!-- Entry card body -->
    <div class="ec-card" :class="{ 'ec-card--checked': entry.checkedIn }">

      <!-- Session variant: profile name + badges -->
      <template v-if="displayType === 'session'">
        <div class="ec-card-left">
          <RouterLink v-if="entry.profile.slug" :to="profilePath(entry.profile.slug)" class="ec-name">
            {{ entry.profile.name ?? 'Unknown' }}
          </RouterLink>
          <span v-else class="ec-name ec-name--plain">{{ entry.profile.name ?? 'Unknown' }}</span>
          <!-- Profile badges -->
          <span v-if="entry.profile.isMember && !entry.profile.isGroup" class="ec-icon" title="Charity Member">
            <img src="/icons/member.svg" alt="Member" />
          </span>
          <span v-if="entry.profile.cardStatus === 'Accepted'" class="ec-icon" title="Benefits Card">
            <img src="/icons/card.svg" alt="Card" />
          </span>
          <span v-if="entry.profile.cardStatus === 'Invited'" class="ec-icon icon-orange" title="Card Invited">
            <img src="/icons/card.svg" alt="Card" />
          </span>
          <span v-if="entry.profile.isGroup" class="ec-icon" title="Group">
            <img src="/icons/group.svg" alt="Group" />
          </span>
          <!-- Notes tag icons -->
          <span
            v-for="t in iconsFromNotes(entry.notes)"
            :key="t.tag"
            class="ec-icon"
            :class="t.color ? 'icon-' + t.color : ''"
            :title="t.alt"
          >
            <img :src="'/icons/' + t.icon" :alt="t.alt" />
          </span>
        </div>
        <div class="ec-card-right">
          <button v-if="allowCancel" class="ec-cancel" @click="emit('cancel', entry)" title="Remove">✕</button>
        </div>
      </template>

      <!-- Profile variant: date + group name as single linked title -->
      <template v-else>
        <div class="ec-card-left">
          <RouterLink :to="sessionPath(entry.session.groupKey, entry.session.date)" class="ec-name">
            {{ entry.session.date }} {{ entry.session.groupName }}
          </RouterLink>
          <!-- Profile badges -->
          <span v-if="entry.profile.isMember && !entry.profile.isGroup" class="ec-icon" title="Charity Member">
            <img src="/icons/member.svg" alt="Member" />
          </span>
          <span v-if="entry.profile.cardStatus === 'Accepted'" class="ec-icon" title="Benefits Card">
            <img src="/icons/card.svg" alt="Card" />
          </span>
          <span v-if="entry.profile.cardStatus === 'Invited'" class="ec-icon icon-orange" title="Card Invited">
            <img src="/icons/card.svg" alt="Card" />
          </span>
          <span v-if="entry.profile.isGroup" class="ec-icon" title="Group">
            <img src="/icons/group.svg" alt="Group" />
          </span>
          <!-- Notes tag icons -->
          <span
            v-for="t in iconsFromNotes(entry.notes)"
            :key="t.tag"
            class="ec-icon"
            :class="t.color ? 'icon-' + t.color : ''"
            :title="t.alt"
          >
            <img :src="'/icons/' + t.icon" :alt="t.alt" />
          </span>
        </div>
        <div class="ec-card-right">
          <button v-if="allowCancel" class="ec-cancel" @click="emit('cancel', entry)" title="Remove">✕</button>
        </div>
      </template>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import { profilePath, sessionPath } from '../router/index'
import type { EntryItem } from '../types/entry'
import { iconsFromNotes } from '../utils/tagIcons'

const props = defineProps<{
  entry: EntryItem
  displayType: 'session' | 'profile'
  allowEdit?: boolean
  allowCancel?: boolean
  working?: boolean
}>()

const emit = defineEmits<{
  'update': [entry: EntryItem, checkedIn: boolean, hours: number]
  'cancel': [entry: EntryItem]
}>()

const showHours = ref(false)
const hoursInput = ref<HTMLInputElement | null>(null)
const handlingHours = ref(false)

function onCheckClick(entry: EntryItem) {
  if (!entry.checkedIn) {
    // State 1 → 2: check in
    emit('update', entry, true, entry.hours)
  } else {
    // State 2 → 3: open hours input and focus it
    showHours.value = true
    nextTick(() => hoursInput.value?.focus())
  }
}

function onHoursChange(entry: EntryItem, input: HTMLInputElement) {
  if (handlingHours.value) return
  handlingHours.value = true
  const val = input.value.trim()
  if (val === '') {
    // Deleted — revert all the way to unchecked
    showHours.value = false
    emit('update', entry, false, 0)
  } else {
    const hours = parseFloat(val)
    if (!isNaN(hours) && hours > 0 && hours !== entry.hours) emit('update', entry, true, hours)
  }
  handlingHours.value = false
}
</script>

<style scoped>
.ec-row {
  display: flex;
  align-items: stretch;
  gap: 0.5rem;
}

/* Check/hours control */
.ec-check {
  width: 2.5rem;
  height: 2.5rem;
  flex-shrink: 0;
  align-self: flex-start;
  background: var(--color-dtv-sand);
  border: 2px solid var(--color-dtv-sand-dark);
  cursor: pointer;
  font-size: 1.1rem;
  color: var(--color-white);
  display: flex;
  align-items: center;
  justify-content: center;
}
.ec-check--on {
  background: var(--color-dtv-green);
  border-color: var(--color-dtv-green);
}
.ec-check--working { pointer-events: none; cursor: default; }
.ec-check:focus-visible,
.ec-check--hours:focus-visible {
  outline: 2px solid var(--color-dtv-dark);
  outline-offset: 3px;
}

.ec-spinner {
  display: block;
  width: 1rem;
  height: 1rem;
  border: 2px solid var(--color-dtv-sand-dark);
  border-top-color: var(--color-dtv-green);
  border-radius: 50%;
  animation: ec-spin 0.7s linear infinite;
}

.ec-check--on .ec-spinner,
.ec-spinner--white {
  border-color: rgba(255, 255, 255, 0.4);
  border-top-color: white;
}

@keyframes ec-spin {
  to { transform: rotate(360deg); }
}

.ec-check--hours {
  background: var(--color-dtv-green);
  border-color: var(--color-dtv-green);
  color: var(--color-white);
  font-size: 0.85rem;
  font-family: inherit;
  font-weight: 600;
  text-align: center;
  cursor: text;
  padding: 0;
}
.ec-check--hours::-webkit-inner-spin-button,
.ec-check--hours::-webkit-outer-spin-button { -webkit-appearance: none; }

.ec-check--hours-static,
.ec-check--static {
  cursor: default;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-muted);
  background: var(--color-dtv-sand);
  border: 2px solid var(--color-dtv-sand-dark);
}

/* Card body */
.ec-card {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  background: var(--color-white);
  border-left: 4px solid transparent;
  gap: 0.5rem;
}
.ec-card--checked {
  border-left-color: var(--color-dtv-green);
}

.ec-card-left {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 0.25rem;
  overflow: hidden;
}

.ec-card-right {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

/* Name */
.ec-name {
  color: var(--color-text);
  font-size: 0.95rem;
  font-weight: 400;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex-shrink: 1;
  text-decoration: none;
}
.ec-name:hover { text-decoration: underline; }
.ec-name--plain { cursor: default; }
.ec-name--plain:hover { text-decoration: none; }

/* SVG icon tags */
.ec-icon {
  display: inline-flex;
  align-items: center;
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
}
.ec-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* Cancel button */
.ec-cancel {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.8rem;
  color: var(--color-text-muted);
  padding: 0.25rem;
  line-height: 1;
}
.ec-cancel:hover { color: var(--color-error); }
</style>
