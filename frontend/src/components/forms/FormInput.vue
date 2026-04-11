<template>
  <input
    class="form-input"
    :type="type"
    :placeholder="placeholder"
    :disabled="disabled"
    :autocomplete="autocomplete"
    :value="modelValue"
    @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    @keydown.enter="emit('enter')"
  />
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  modelValue: string
  type?: string
  placeholder?: string
  disabled?: boolean
  autocomplete?: string
}>(), {
  type: 'text',
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'enter': []
}>()
</script>

<style scoped>
.form-input {
  display: block;
  width: 100%;
  padding: 0.65rem 0.75rem;
  border: none;
  background: var(--color-dtv-light);
  color: var(--color-dtv-dark);
  font-family: var(--font-body);
  font-size: 1rem;
  line-height: 1.4;
  box-sizing: border-box;
}

/* Override browser autofill background (Chrome uses #E8F0FE otherwise) */
.form-input:-webkit-autofill,
.form-input:-webkit-autofill:hover,
.form-input:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 1000px var(--color-dtv-light) inset;
  -webkit-text-fill-color: var(--color-dtv-dark);
}

.form-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-input::placeholder {
  color: var(--color-dtv-sand-dark);
}
</style>
