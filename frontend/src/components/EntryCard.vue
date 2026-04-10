<template>
  <div class="ec-row">

    <!-- Card body -->
    <div class="ec-card" :class="{ 'ec-card--checked': checkedIn }">
      <div class="ec-card-left">

        <button v-if="allowEdit" class="ec-name ec-name--btn" @click="emit('editEntry')">
          {{ title }}
        </button>
        <RouterLink v-else-if="titleTo" :to="titleTo" class="ec-name">
          {{ title }}
        </RouterLink>
        <span v-else class="ec-name ec-name--plain">{{ title }}</span>

        <span
          v-for="icon in icons"
          :key="icon.alt"
          class="ec-icon"
          :class="icon.color ? 'icon-' + icon.color : ''"
          :title="icon.alt"
        >
          <img :src="'/icons/' + icon.icon" :alt="icon.alt" />
        </span>

      </div>
      <div class="ec-card-right">
        <button v-if="allowCancel" class="ec-cancel" @click="emit('cancel')" title="Remove">✕</button>
      </div>
    </div>

    <!-- Check/hours control -->
    <template v-if="allowEdit">
      <div v-if="working && (showHours || hours > 0)" class="ec-check ec-check--on">
        <span class="ec-spinner ec-spinner--white" />
      </div>
      <input
        v-else-if="showHours || hours > 0"
        ref="hoursInput"
        type="number"
        class="ec-check ec-check--hours"
        :value="hours > 0 ? hours : 3"
        min="0"
        step="0.5"
        @blur="onHoursChange(($event.target as HTMLInputElement))"
        @keydown.enter.prevent="onHoursChange(($event.target as HTMLInputElement))"
      />
      <button
        v-else
        class="ec-check"
        :class="{ 'ec-check--on': checkedIn, 'ec-check--working': working }"
        @click="onCheckClick"
      >
        <span v-if="working" class="ec-spinner" />
        <span v-else-if="checkedIn">✓</span>
      </button>
    </template>
    <div v-else-if="hours > 0" class="ec-check ec-check--hours-static">
      {{ hours }}h
    </div>
    <div v-else class="ec-check ec-check--static" :class="{ 'ec-check--on': checkedIn }">
      <span v-if="checkedIn">✓</span>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import type { TagIcon } from '../utils/tagIcons'

const props = defineProps<{
  title: string
  titleTo?: RouteLocationRaw
  checkedIn: boolean
  hours: number
  icons?: TagIcon[]
  allowEdit?: boolean
  allowCancel?: boolean
  working?: boolean
}>()

const emit = defineEmits<{
  'update': [checkedIn: boolean, hours: number]
  'editEntry': []
  'cancel': []
}>()

const showHours = ref(false)
const hoursInput = ref<HTMLInputElement | null>(null)
const handlingHours = ref(false)

function onCheckClick() {
  if (!props.checkedIn) {
    emit('update', true, props.hours)
  } else {
    showHours.value = true
    nextTick(() => hoursInput.value?.focus())
  }
}

function onHoursChange(input: HTMLInputElement) {
  if (handlingHours.value) return
  handlingHours.value = true
  const val = input.value.trim()
  if (val === '') {
    showHours.value = false
    emit('update', false, 0)
  } else {
    const h = parseFloat(val)
    if (!isNaN(h) && h > 0 && h !== props.hours) emit('update', true, h)
  }
  handlingHours.value = false
}
</script>

<style scoped>
.ec-row {
  display: flex;
  align-items: stretch;
  gap: 0;
}

.ec-check {
  width: 2.5rem;
  height: 2.5rem;
  flex-shrink: 0;
  align-self: flex-start;
  background: var(--color-dtv-gold);
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  color: var(--color-white);
  display: flex;
  align-items: center;
  justify-content: center;
}
.ec-check--on {
  background: var(--color-dtv-green);
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
@keyframes ec-spin { to { transform: rotate(360deg); } }

.ec-check--hours {
  background: var(--color-dtv-green);
  border: none;
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
  border: none;
}

.ec-card {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  background: var(--color-dtv-sand);
  border-left: 4px solid transparent;
  gap: 0.5rem;
}
.ec-card--checked { border-left-color: var(--color-dtv-green); }

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
.ec-name--btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-align: left;
}

.ec-icon {
  display: inline-flex;
  align-items: flex-start;
  width: 0.875rem;
  height: 0.875rem;
  flex-shrink: 0;
  align-self: flex-start;
}
.ec-icon img { width: 100%; height: 100%; object-fit: contain; }

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
