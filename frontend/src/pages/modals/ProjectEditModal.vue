<template>
  <ModalLayout
    title="Edit Project"
    action="Save"
    action-icon="save"
    :show-delete="canDelete"
    :action-disabled="!form.key.trim() || !form.name.trim()"
    :working="working"
    :error="error"
    @close="emit('close')"
    @action="save"
    @delete="emit('delete')"
  >
    <FormLayout :disabled="working">
      <FormRow title="Display Name" :full-width="true">
        <ModalFormInput v-model="form.name" />
      </FormRow>
      <FormRow title="Key" :full-width="true">
        <ModalFormInput v-model="form.key" />
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
import { resolveMetadataTags } from '../../utils/taxonomyPath'
import type { ProjectDetailResponse } from '../../../../types/api-responses'
import ModalLayout from '../../components/ModalLayout.vue'
import FormLayout from '../../components/FormLayout.vue'
import FormRow from '../../components/FormRow.vue'
import ModalFormInput from '../../components/forms/ModalFormInput.vue'
import ModalFormTextarea from '../../components/forms/ModalFormTextarea.vue'
import ModalFormSelect from '../../components/forms/ModalFormSelect.vue'
import TermPicker from '../../components/TermPicker.vue'
import { useTaxonomy } from '../../composables/useTaxonomy'

export type EditProjectPayload = {
  displayName: string
  key: string
  description?: string
  /** One of the Status choices, or '' for none */
  status: string
  /** The project's one tag, or [] for none */
  metadata: Array<{ label: string; termGuid: string }>
}

const props = defineProps<{
  project: ProjectDetailResponse
  /** The Projects list's Status choices */
  statuses: string[]
  /** Offer Delete (Admin only; editing is the editProjects permission) */
  canDelete: boolean
  working: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  save: [payload: EditProjectPayload]
  delete: []
}>()

const { tree, loading: taxonomyLoading, error: taxonomyError } = useTaxonomy()

const currentTag = props.project.metadata?.[0]

const form = reactive({
  name: props.project.displayName ?? '',
  key: props.project.key,
  description: props.project.description ?? '',
  status: props.project.status ?? '',
  tag: currentTag?.label ?? '',
  termGuid: currentTag?.termGuid ?? '',
})

// Show the tag as its full path (what the picker lists), found from its term ID once the
// tree is in, unless a different tag has been picked meanwhile.
watch(tree, t => {
  if (currentTag && form.termGuid === currentTag.termGuid) {
    form.tag = resolveMetadataTags([currentTag], t)[0].label
  }
}, { immediate: true })

function save() {
  emit('save', {
    displayName: form.name.trim(),
    key: form.key.trim(),
    description: form.description.trim() || undefined,
    status: form.status,
    metadata: form.tag ? [{ label: form.tag, termGuid: form.termGuid }] : [],
  })
}
</script>
