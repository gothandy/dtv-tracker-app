<template>
  <DefaultLayout>
    <div class="sandbox">

      <RouterLink to="/sandbox" class="back">← Sandbox</RouterLink>
      <h1>ModalLayout</h1>

      <div class="row">
        <div>
          <h2>Close only</h2>
          <AppButton label="Open" @click="open = 'close'" />
        </div>
        <div>
          <h2>Action only</h2>
          <AppButton label="Open" @click="open = 'action'" />
        </div>
        <div>
          <h2>Delete + Action</h2>
          <AppButton label="Open" @click="open = 'delete-action'" />
        </div>
        <div>
          <h2>Delete confirm</h2>
          <AppButton label="Open" @click="open = 'delete-confirm'" />
        </div>
      </div>

      <ModalLayout v-if="open === 'close'"
        title="Add Entry"
        @close="open = null"
      >
        Body content here.
      </ModalLayout>

      <ModalLayout v-if="open === 'action'"
        title="Set Hours"
        action="Save"
        @close="open = null"
        @action="open = null"
      >
        Body content here.
      </ModalLayout>

      <ModalLayout v-if="open === 'delete-action'"
        title="Edit Session"
        action="Save"
        show-delete
        @close="open = null"
        @action="open = null"
        @delete="open = 'delete-confirm'"
      >
        Body content here.
      </ModalLayout>

      <ModalLayout v-if="open === 'delete-confirm'"
        title="Delete Session?"
        action="Cancel"
        show-delete
        @close="open = null"
        @action="open = null"
        @delete="open = null"
      >
        This will permanently delete the session and all its entries.
      </ModalLayout>

    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { usePageTitle } from '../../composables/usePageTitle'
usePageTitle('Sandbox')
import { ref } from 'vue'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import ModalLayout from '../../components/ModalLayout.vue'
import AppButton from '../../components/AppButton.vue'

const open = ref<string | null>(null)
</script>

<style scoped>
.sandbox {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.back { color: var(--color-dtv-green); text-decoration: none; font-size: 0.9rem; }
.back:hover { text-decoration: underline; }

h1 {
  font-size: 1.5rem;
  font-weight: 700;
  border-bottom: 2px solid #ccc;
  padding-bottom: 0.5rem;
}

h2 { font-size: 1rem; font-weight: 600; color: #666; margin-bottom: 0.5rem; }

.row {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
}
</style>
