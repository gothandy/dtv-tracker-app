<template>
  <div class="sna-wrap">
    <p class="sna-label">Took some photos?</p>
    <AppButton usage="task" label="Click to upload" icon="uploadphoto" :href="uploadHref" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppButton from '../../AppButton.vue'
import { uploadPath } from '../../../router/index'

const props = defineProps<{ entryId: number }>()

const uploadHref = computed(() => uploadPath(props.entryId))
</script>

<style scoped>
.sna-wrap {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  text-align: center;
}

.sna-label {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin: 0;
}
</style>
