<template>
  <DefaultLayout>
    <div class="sandbox">
      <RouterLink to="/sandbox" class="back">← Sandbox</RouterLink>
      <h1>UploadPage</h1>

      <!-- Loading -->
      <h2>Loading</h2>
      <div class="task-body">
        <FormCard title="Upload Photos">
          <p class="status-text">Loading…</p>
        </FormCard>
      </div>

      <!-- Error: no entry ID -->
      <h2>Error — no entry ID</h2>
      <div class="task-body">
        <FormCard title="Link not found">
          <p class="status-text">No entry ID was provided. Please use the Upload button from your entry.</p>
        </FormCard>
      </div>

      <!-- Error: wrong account (with action) -->
      <h2>Error — wrong account</h2>
      <div class="task-body">
        <FormCard title="Wrong account">
          <p class="status-text">This upload link belongs to a different account. Please sign in with the correct account.</p>
          <FormSubmitRow>
            <FormButton href="/login">Sign in</FormButton>
          </FormSubmitRow>
        </FormCard>
      </div>

      <!-- Error: not found -->
      <h2>Error — link not found</h2>
      <div class="task-body">
        <FormCard title="Link not found">
          <p class="status-text">This upload link could not be found. It may have been removed.</p>
        </FormCard>
      </div>

      <!-- Form: empty -->
      <h2>Form — no files</h2>
      <div class="task-body">
        <FormCard title="Upload for Jane Smith" subtitle="Sheepskull · 5 Apr 2026">
          <div class="drop-zone">
            <span class="drop-zone-label">Tap or drag to add photos &amp; videos</span>
            <span class="drop-zone-hint">JPG, PNG, WebP, HEIC, MP4, MOV · max 15 MB each · up to 10 files</span>
          </div>
          <FormSubmitRow>
            <FormButton :disabled="true">Upload</FormButton>
          </FormSubmitRow>
        </FormCard>
      </div>

      <!-- Form: files selected -->
      <h2>Form — files selected</h2>
      <div class="task-body">
        <FormCard title="Upload for Jane Smith" subtitle="Sheepskull · 5 Apr 2026">
          <div class="drop-zone drop-zone--has-files">
            <span class="drop-zone-label drop-zone-label--small">3 files selected — tap to add more</span>
            <span class="drop-zone-hint">JPG, PNG, WebP, HEIC, MP4, MOV · max 15 MB each · up to 10 files</span>
          </div>
          <ul class="file-list">
            <li v-for="f in pendingFiles" :key="f.name" class="file-item">
              <span class="file-name">{{ f.name }}</span>
              <span class="file-status file-status--pending">Pending</span>
            </li>
          </ul>
          <FormSubmitRow>
            <FormButton>Upload</FormButton>
          </FormSubmitRow>
        </FormCard>
      </div>

      <!-- Form: uploading -->
      <h2>Uploading…</h2>
      <div class="task-body">
        <FormCard title="Upload for Jane Smith" subtitle="Sheepskull · 5 Apr 2026">
          <div class="drop-zone drop-zone--has-files">
            <span class="drop-zone-label drop-zone-label--small">3 files selected — tap to add more</span>
            <span class="drop-zone-hint">JPG, PNG, WebP, HEIC, MP4, MOV · max 15 MB each · up to 10 files</span>
          </div>
          <ul class="file-list">
            <li class="file-item">
              <span class="file-name">IMG_0042.jpg</span>
              <span class="file-status file-status--ok">✓ Done</span>
            </li>
            <li class="file-item">
              <span class="file-name">IMG_0043.jpg</span>
              <span class="file-status file-status--uploading">Uploading…</span>
            </li>
            <li class="file-item">
              <span class="file-name">IMG_0044.jpg</span>
              <span class="file-status file-status--pending">Pending</span>
            </li>
          </ul>
          <FormSubmitRow>
            <FormButton :working="true">Uploading 2 of 3…</FormButton>
          </FormSubmitRow>
        </FormCard>
      </div>

      <!-- Form: partial failure -->
      <h2>Partial failure</h2>
      <div class="task-body">
        <FormCard title="Upload for Jane Smith" subtitle="Sheepskull · 5 Apr 2026">
          <div class="drop-zone drop-zone--has-files">
            <span class="drop-zone-label drop-zone-label--small">3 files selected — tap to add more</span>
            <span class="drop-zone-hint">JPG, PNG, WebP, HEIC, MP4, MOV · max 15 MB each · up to 10 files</span>
          </div>
          <ul class="file-list">
            <li class="file-item">
              <span class="file-name">IMG_0042.jpg</span>
              <span class="file-status file-status--ok">✓ Done</span>
            </li>
            <li class="file-item">
              <span class="file-name">IMG_0043.jpg</span>
              <span class="file-status file-status--error">✕ Failed</span>
            </li>
            <li class="file-item">
              <span class="file-name">IMG_0044.jpg</span>
              <span class="file-status file-status--ok">✓ Done</span>
            </li>
          </ul>
          <FormSubmitRow>
            <FormButton>Upload</FormButton>
            <p class="form-error">You can only upload to your own entries.</p>
          </FormSubmitRow>
        </FormCard>
      </div>

      <!-- Form: over limit -->
      <h2>Over limit</h2>
      <div class="task-body">
        <FormCard title="Upload for Jane Smith" subtitle="Sheepskull · 5 Apr 2026">
          <div class="drop-zone drop-zone--has-files">
            <span class="drop-zone-label drop-zone-label--small">11 files selected — tap to add more</span>
            <span class="drop-zone-hint">JPG, PNG, WebP, HEIC, MP4, MOV · max 15 MB each · up to 10 files</span>
          </div>
          <ul class="file-list">
            <li v-for="f in overLimitFiles" :key="f.name" class="file-item">
              <span class="file-name">{{ f.name }}</span>
              <span class="file-status file-status--pending">Pending</span>
            </li>
          </ul>
          <p class="form-error">Maximum 10 files. Please remove some and try again.</p>
          <FormSubmitRow>
            <FormButton :disabled="true">Upload</FormButton>
          </FormSubmitRow>
        </FormCard>
      </div>

      <!-- Success -->
      <h2>Success</h2>
      <div class="task-body">
        <FormCard title="Photos uploaded">
          <p class="status-text"><strong>3</strong> files uploaded successfully.</p>
          <p class="status-note">Photos are reviewed before appearing publicly.</p>
          <FormSubmitRow>
            <FormButton href="/sessions/sheepskull/2026-04-05">View session gallery</FormButton>
          </FormSubmitRow>
        </FormCard>
      </div>

    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import '../../styles/sandbox.css'
import { usePageTitle } from '../../composables/usePageTitle'
import DefaultLayout from '../../layouts/DefaultLayout.vue'
import FormCard from '../../components/forms/FormCard.vue'
import FormSubmitRow from '../../components/forms/FormSubmitRow.vue'
import FormButton from '../../components/forms/FormButton.vue'

usePageTitle('Sandbox — UploadPage')

const pendingFiles = [
  { name: 'IMG_0042.jpg' },
  { name: 'IMG_0043.jpg' },
  { name: 'IMG_0044.jpg' },
]

const overLimitFiles = Array.from({ length: 11 }, (_, i) => ({ name: `IMG_00${42 + i}.jpg` }))
</script>

<style scoped>
.task-body {
  max-width: 26rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.status-text {
  font-size: 0.9rem;
  color: var(--color-dtv-dark);
  opacity: 0.7;
  margin: 0 0 0.25rem;
  text-align: center;
  line-height: 1.5;
}

.status-text strong {
  opacity: 1;
  font-weight: 700;
}

.status-note {
  font-size: 0.8rem;
  color: var(--color-dtv-dark);
  opacity: 0.5;
  text-align: center;
  margin: 0;
}

.drop-zone {
  border: 2px dashed var(--color-dtv-sand-dark);
  padding: 1.5rem 1rem;
  text-align: center;
  cursor: pointer;
  margin-bottom: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.drop-zone--has-files {
  border-style: solid;
  border-color: var(--color-dtv-sand-dark);
}

.drop-zone-label {
  font-size: 0.95rem;
  color: var(--color-dtv-dark);
}

.drop-zone-label--small {
  font-weight: 600;
}

.drop-zone-hint {
  font-size: 0.78rem;
  color: var(--color-dtv-dark);
  opacity: 0.5;
}

.file-list {
  list-style: none;
  margin: 0 0 0.25rem;
  padding: 0;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0;
  border-bottom: 1px solid var(--color-dtv-sand);
  font-size: 0.85rem;
}

.file-item:last-child {
  border-bottom: none;
}

.file-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-dtv-dark);
}

.file-status {
  flex-shrink: 0;
  font-weight: 600;
  font-size: 0.8rem;
}

.file-status--pending   { color: var(--color-dtv-dark); opacity: 0.4; }
.file-status--uploading { color: var(--color-dtv-gold-dark); }
.file-status--ok        { color: var(--color-dtv-green-dark); }
.file-status--error     { color: var(--color-dtv-dirt); }

.form-error {
  font-size: 0.875rem;
  color: var(--color-dtv-dirt);
  text-align: center;
  margin: 0;
}
</style>
