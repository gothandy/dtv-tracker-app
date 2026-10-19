<template>
  <ModalLayout
    title="New Project"
    action="Create"
    :action-disabled="!form.key.trim() || !form.name.trim()"
    :working="working"
    :error="error"
    @close="emit('close')"
    @action="add"
  >
    <FormLayout :disabled="working">
      <FormRow title="Display Name" :full-width="true">
        <ModalFormInput v-model="form.name" />
      </FormRow>
      <FormRow title="Key" :full-width="true">
        <ModalFormInput v-model="form.key" placeholder="bridge" />
      </FormRow>
      <FormRow title="Description" :full-width="true">
        <ModalFormTextarea v-model="form.description" />
      </FormRow>
      <FormRow title="Status" :full-width="true">
        <ModalFormSelect v-model="form.status">
          <option value="">No status</option>
          <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
        </ModalFormSelect>
      </FormRow>
      <FormRow title="Tag" :full-width="true">
        <TermPicker
          v-model="form.tag"
          :tree="tree"
          :loading="taxonomyLoading"
          :disabled="!!taxonomyError"
          all-label="No tag"
          placeholder="No tag"
          @select="(_label, termGuid) => form.termGuid = termGuid"
        />
        <p v-if="taxonomyError" class="modal-form-error">{{ taxonomyError }}</p>
      </FormRow>
    </FormLayout>
  </ModalLayout>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { buildTermGuidToPathMap } from '../../utils/taxonomyPath'
import ModalLayout from '../../components/ModalLayout.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'
import ModalFormInput from '../../components/forms/ModalFormInput.vue'
import ModalFormTextarea from '../../components/forms/ModalFormTextarea.vue'
import ModalFormSelect from '../../components/forms/ModalFormSelect.vue'
import TermPicker from '../../components/TermPicker.vue'
import { useTaxonomy } from '../../composables/useTaxonomy'

export type AddProjectPayload = {
  key: string
  name: string
  description?: string
  /** One of the Status choices, or '' for none */
  status: string
  /** The project's one tag, or [] for none */
  metadata: Array<{ label: string; termGuid: string }>
}

const props = defineProps<{
  /** The Projects list's Status choices */
  statuses: string[]
  /** A tag to start with, e.g. the trail from a No projects card ("XC:Adit") */
  initialTag?: string
  working: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  add: [payload: AddProjectPayload]
}>()

const { tree, loading: taxonomyLoading, error: taxonomyError } = useTaxonomy()

const form = reactive({ key: '', name: '', description: '', status: '', tag: props.initialTag ?? '', termGuid: '' })

// The starting tag's term ID, once the tree is in (unless another tag has been picked).
watch(tree, t => {
  if (!props.initialTag || form.tag !== props.initialTag || form.termGuid) return
  for (const [guid, path] of buildTermGuidToPathMap(t)) {
    if (path === props.initialTag) form.termGuid = guid
  }
}, { immediate: true })

function add() {
  emit('add', {
    key: form.key.trim(),
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    status: form.status,
    metadata: form.tag ? [{ label: form.tag, termGuid: form.termGuid }] : [],
  })
}
</script>
