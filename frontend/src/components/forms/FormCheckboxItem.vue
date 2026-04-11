<template>
  <div class="fci">
    <input
      :id="id"
      class="fci-checkbox"
      type="checkbox"
      :checked="modelValue"
      :required="required"
      @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <div class="fci-body">
      <label :for="id" class="fci-label">{{ label }}</label>
      <p v-if="description" class="fci-description">{{ description }}</p>
      <p v-if="required" class="fci-required">Required</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue'

withDefaults(defineProps<{
  modelValue: boolean
  label: string
  description?: string
  required?: boolean
}>(), {
  required: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const id = useId()
</script>

<style scoped>
.fci {
  display: flex;
  gap: 0.85rem;
  align-items: flex-start;
  padding: 0.85rem 0;
  border-bottom: 1px solid var(--color-dtv-sand-dark);
}

.fci:last-child {
  border-bottom: none;
}

.fci-checkbox {
  width: 1.5rem;
  height: 1.5rem;
  min-width: 1.5rem;
  accent-color: var(--color-dtv-green);
  cursor: pointer;
  margin-top: 0.1rem;
}

.fci-body {
  flex: 1;
  min-width: 0;
}

.fci-label {
  display: block;
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--color-dtv-dark);
  cursor: pointer;
}

.fci-description {
  font-size: 0.85rem;
  color: var(--color-dtv-dark);
  opacity: 0.65;
  margin: 0.2rem 0 0;
  line-height: 1.4;
}

.fci-required {
  font-size: 0.75rem;
  color: var(--color-dtv-dark);
  opacity: 0.5;
  margin: 0.2rem 0 0;
}
</style>
