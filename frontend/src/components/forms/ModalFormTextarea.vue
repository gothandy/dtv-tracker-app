<template>
  <textarea
    v-model="model"
    class="modal-form-control modal-form-control--multiline"
    :rows="rows"
    :placeholder="placeholder"
    :disabled="disabled"
  />
</template>

<script setup lang="ts">
const model = defineModel<string>({ required: true })

withDefaults(defineProps<{
  rows?: number
  placeholder?: string
  disabled?: boolean
}>(), {
  rows: 3,
  disabled: false,
})
</script>
