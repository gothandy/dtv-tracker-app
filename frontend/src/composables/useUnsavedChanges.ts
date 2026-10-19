import { onMounted, onUnmounted, type Ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

/**
 * Warns before leaving a page with unsaved edits, using the browser's own dialogs: a confirm
 * when moving within the tracker, and the browser's "Leave site?" when closing, reloading or
 * going to another address (its wording is the browser's). Call it from a page's setup with
 * whether anything is unsaved, e.g. `useUnsavedChanges(changed)`.
 */
export function useUnsavedChanges(changed: Ref<boolean>, message = 'You have unsaved changes. Leave without saving?') {
  onBeforeRouteLeave(() => !changed.value || window.confirm(message))

  function onBeforeUnload(e: BeforeUnloadEvent) {
    if (!changed.value) return
    e.preventDefault()
    e.returnValue = ''
  }
  onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
  onUnmounted(() => window.removeEventListener('beforeunload', onBeforeUnload))
}
