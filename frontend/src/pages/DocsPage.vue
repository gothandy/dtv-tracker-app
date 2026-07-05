<template>
  <DefaultLayout>
    <h1 class="sr-only">{{ pageHeading }}</h1>
    <PageHeader>{{ pageHeading }}</PageHeader>
    <div class="px-6 pt-4 pb-8">
      <p v-if="loading" class="text-sm text-gray-500">Loading documents…</p>
      <p v-else-if="error" class="text-sm text-red-600">{{ error }}</p>
      <p v-else-if="!tree.length" class="text-sm text-gray-500">No documents available.</p>
      <template v-else>
        <nav v-if="breadcrumb.length > 1" class="docs-breadcrumb" aria-label="Docs location">
          <RouterLink :to="docsPath()">Docs</RouterLink>
          <template v-for="(crumb, index) in breadcrumb" :key="crumb.slug">
            <span class="docs-breadcrumb-sep" aria-hidden="true">/</span>
            <RouterLink
              v-if="index < breadcrumb.length - 1"
              :to="docsSectionPath(...breadcrumb.slice(0, index + 1).map(item => item.slug))"
            >{{ crumb.name }}</RouterLink>
            <span v-else class="docs-breadcrumb-current">{{ crumb.name }}</span>
          </template>
        </nav>

        <template v-if="!pathSegments.length">
          <div v-if="rootFolders.length" class="docs-root-folder-list">
            <DocsFolderLink
              v-for="folder in rootFolders"
              :key="folder.slug"
              :label="folder.name"
              :to="docsSectionPath(folder.slug)"
            />
          </div>
          <div v-if="rootFiles.length" class="pdc-grid docs-root-files">
            <DocLozengeLink
              v-for="file in rootFiles"
              :key="file.slug"
              :label="file.name"
              :url="file.url!"
            />
          </div>
          <p v-if="!rootFolders.length && !rootFiles.length" class="text-sm text-gray-500">No documents available.</p>
        </template>

        <DocsFolderContents
          v-else-if="activeFolder"
          :folder="activeFolder"
          :path-segments="pathSegments"
        />

        <p v-else class="text-sm text-gray-500">
          This section could not be found.
          <RouterLink :to="docsPath()" class="text-dtv-green hover:underline">Back to Docs</RouterLink>
        </p>
      </template>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import PageHeader from '../components/PageHeader.vue'
import DocLozengeLink from '../components/docs/DocLozengeLink.vue'
import DocsFolderContents from '../components/docs/DocsFolderContents.vue'
import DocsFolderLink from '../components/docs/DocsFolderLink.vue'
import { usePageTitle } from '../composables/usePageTitle'
import { docsPath, docsSectionPath } from '../router/index'
import {
  docsFolderBreadcrumb,
  findDocsFolderByPath,
  partitionDocsNodes,
} from '../utils/docsTree'
import type { DocsTreeNode } from '../../../types/api-responses'

const route = useRoute()
const tree = ref<DocsTreeNode[]>([])
const loading = ref(true)
const error = ref('')

const pathSegments = computed(() => {
  const pathParam = route.params.pathMatch
  const segments = Array.isArray(pathParam) ? pathParam : pathParam ? [pathParam] : []
  return segments.filter(Boolean)
})

const activeFolder = computed(() =>
  pathSegments.value.length ? findDocsFolderByPath(tree.value, pathSegments.value) : null
)

const breadcrumb = computed(() => docsFolderBreadcrumb(tree.value, pathSegments.value))

const rootContents = computed(() => partitionDocsNodes(tree.value))
const rootFolders = computed(() => rootContents.value.folders)
const rootFiles = computed(() => rootContents.value.files)

const pageHeading = computed(() => {
  if (activeFolder.value) return activeFolder.value.name
  return 'Docs'
})

usePageTitle(pageHeading)

async function loadTree() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch('/api/docs')
    if (!res.ok) throw new Error(`Failed to load docs (${res.status})`)
    const json = await res.json()
    if (!json.success) throw new Error(json.error || 'Failed to load docs')
    tree.value = json.data ?? []
  } catch (err) {
    console.error('Error loading docs:', err)
    error.value = 'Could not load documents. Please try again later.'
  } finally {
    loading.value = false
  }
}

loadTree()
</script>

<style scoped>
.docs-breadcrumb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 1rem;
  font-size: 0.85rem;
}

.docs-breadcrumb a {
  color: var(--color-dtv-green);
  text-decoration: none;
}

.docs-breadcrumb a:hover {
  text-decoration: underline;
}

.docs-breadcrumb-sep {
  color: var(--color-text-muted);
}

.docs-breadcrumb-current {
  color: var(--color-text-muted);
}

.docs-root-folder-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.docs-root-files {
  margin-top: 1rem;
}
</style>
