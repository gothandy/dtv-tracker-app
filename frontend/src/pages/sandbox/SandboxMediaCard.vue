<template>
  <DefaultLayout>
    <div class="sandbox">

      <SandboxBackLink />
      <h1>MediaCard</h1>

      <h2>Natural aspect ratio</h2>
      <div class="card-row">
        <MediaCard :item="landscape"          :min-ratio="0" :max-ratio="Infinity" />
        <MediaCard :item="portraitLongTitle"  :min-ratio="0" :max-ratio="Infinity" />
      </div>

      <h2>Constrained 3/4 – 4/3</h2>
      <div class="card-row">
        <MediaCard :item="landscape" :min-ratio="3/4" :max-ratio="4/3" />
        <MediaCard :item="portrait"  :min-ratio="3/4" :max-ratio="4/3" />
      </div>

      <h2>Selected</h2>
      <div class="card-row">
        <MediaCard :item="landscape"       :selected="true" :show-edit-btn="true" />
        <MediaCard :item="portraitNoTitle" :selected="true" :show-edit-btn="true" />
      </div>

      <h2>In layout — constrain width</h2>
      <LayoutColumns ratio="1-1-1">
        <template #left></template>
        <template #middle>
          <MediaCard :item="landscape" constrain="width" :min-ratio="3/4" :max-ratio="4/3" />
        </template>
        <template #right>
          <MediaCard :item="portrait" constrain="width" :min-ratio="3/4" :max-ratio="4/3" />
        </template>
      </LayoutColumns>

      <h2>Clickable + selected</h2>
      <div class="card-row">
        <MediaCard
          v-for="(item, i) in all"
          :key="item.id"
          :item="item"
          :clickable="true"
          :selected="i === pickedIndex"
          :show-edit-btn="true"
          @select="pickedIndex = i"
        />
      </div>

      <h2>Private (isPublic: false)</h2>
      <div class="card-row">
        <MediaCard :item="landscapePrivate" />
        <MediaCard :item="portraitPrivateNoTitle" />
        <MediaCard :item="landscapePrivate" :selected="true" :show-edit-btn="true" />
      </div>

    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import '../../styles/sandbox.css'
import { ref } from 'vue'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import SandboxBackLink from './SandboxBackLink.vue'
import MediaCard from '../../components/MediaCard.vue'
import LayoutColumns from '../../components/LayoutColumns.vue'
import { usePageTitle } from '../../composables/usePageTitle'
import type { MediaItem } from '../../types/media'

usePageTitle('Sandbox')

const pickedIndex = ref<number | null>(null)

const landscape: MediaItem = {
  id: '01TBI4CWZ3IDBYWNHHVRGZEHU2ZBIXLBTT',
  listItemId: 0,
  thumbnailUrl: '/api/media/01TBI4CWZ3IDBYWNHHVRGZEHU2ZBIXLBTT/stream',
  largeUrl:     '/api/media/01TBI4CWZ3IDBYWNHHVRGZEHU2ZBIXLBTT/stream',
  mimeType: 'image/jpeg',
  title: 'Landscape',
  isPublic: true,
  _w: 4000, _h: 2252,
}

const portrait: MediaItem = {
  id: '01TBI4CWY4DLTEPKMEDZD2IPSV75ATKZKA',
  listItemId: 0,
  thumbnailUrl: '/api/media/01TBI4CWY4DLTEPKMEDZD2IPSV75ATKZKA/stream',
  largeUrl:     '/api/media/01TBI4CWY4DLTEPKMEDZD2IPSV75ATKZKA/stream',
  mimeType: 'image/jpeg',
  title: 'Portrait',
  isPublic: true,
  _w: 2252, _h: 4000,
}

const portraitLongTitle: MediaItem = {
  ...portrait,
  id: 'portrait-long',
  title: 'A very long caption that should be truncated when it runs out of space',
}

const portraitNoTitle: MediaItem = { ...portrait, id: 'portrait-no-title', title: null }

const landscapePrivate: MediaItem = { ...landscape, id: 'landscape-private', isPublic: false, title: 'Private with title' }
const portraitPrivateNoTitle: MediaItem = { ...portrait, id: 'portrait-private-no-title', isPublic: false, title: null }

const all = [landscape, portraitNoTitle]
</script>

<style scoped>
.card-row {
  display: flex;
  height: 200px;
  gap: 8px;
}
</style>
