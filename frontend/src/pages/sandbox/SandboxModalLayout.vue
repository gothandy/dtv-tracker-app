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
        <div>
          <h2>Form Rows</h2>
          <AppButton label="Open" @click="open = 'modal-rows'" />
        </div>
        <div>
          <h2>Working state</h2>
          <AppButton label="Open" @click="open = 'working'" />
        </div>
        <div>
          <h2>Error state</h2>
          <AppButton label="Open" @click="open = 'error'" />
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

      <ModalLayout v-if="open === 'modal-rows'"
        title="Example Form Rows"
        action="Save"
        @close="open = null"
        @action="open = null"
      >
        <FormRow title="Name">
          <input class="demo-input" value="Andrew Davies" />
        </FormRow>
        <FormRow title="Checked In">
          <input type="checkbox" class="demo-checkbox" checked />
        </FormRow>
        <FormRow title="Description" :full-width="true">
          <textarea class="demo-input" rows="3">Some longer text here.</textarea>
        </FormRow>
        <FormRow title="Session cover" :disabled="true">
          <input type="checkbox" class="demo-checkbox" disabled />
        </FormRow>
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

      <ModalLayout v-if="open === 'working'"
        title="Working state demo"
        action="Save"
        show-delete
        :working="workingDemo"
        @close="open = null"
        @action="startWorkingDemo('action')"
        @delete="startWorkingDemo('delete')"
      >
        <p>Click Save or Delete to see the working state for 3 seconds.</p>
        <label style="display:block; margin-top:1rem">
          Sample field
          <input type="text" class="demo-input" placeholder="Interactable until working..." style="margin-top:0.25rem" />
        </label>
      </ModalLayout>

      <ModalLayout v-if="open === 'error'"
        title="Error state demo"
        action="Save"
        show-delete
        :working="workingDemo"
        :error="errorMsg"
        @close="open = null; errorMsg = ''"
        @action="startErrorDemo('action')"
        @delete="startErrorDemo('delete')"
      >
        <p>Click Save or Delete — it will fail and show an error. Click again to succeed.</p>
      </ModalLayout>

    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import '../../styles/sandbox.css'
import { usePageTitle } from '../../composables/usePageTitle'
usePageTitle('Sandbox')
import { ref } from 'vue'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import ModalLayout from '../../components/ModalLayout.vue'
import AppButton from '../../components/AppButton.vue'
import FormRow from '../../components/FormRow.vue'

const open = ref<string | null>(null)
const workingDemo = ref(false)
const errorMsg = ref('')
let errorDemoFailed = false

function startWorkingDemo(_button: 'action' | 'delete') {
  workingDemo.value = true
  setTimeout(() => {
    workingDemo.value = false
    open.value = null
  }, 3000)
}

async function startErrorDemo(_button: 'action' | 'delete') {
  workingDemo.value = true
  errorMsg.value = ''
  await new Promise(r => setTimeout(r, 2000))
  if (!errorDemoFailed) {
    errorDemoFailed = true
    workingDemo.value = false
    errorMsg.value = 'Server error (500) — please try again'
  } else {
    errorDemoFailed = false
    workingDemo.value = false
    open.value = null
  }
}
</script>

<style scoped>
.sandbox { gap: 2rem; }

.row {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
}

.demo-input {
  width: 100%;
  background: var(--color-dtv-light);
  border: none;
  color: var(--color-text);
  padding: 0.3rem 0.5rem;
  font-family: inherit;
  font-size: 0.95rem;
  box-sizing: border-box;
}

.demo-checkbox {
  width: 1.5rem;
  height: 1.5rem;
  cursor: pointer;
}
</style>
