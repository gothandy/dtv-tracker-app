import { reactive, watch, nextTick, onMounted, onUnmounted, type Ref, type CSSProperties } from 'vue'
import { placeDropdown, type VisibleArea } from '../utils/dropdownPlacement'

/**
 * The shared behaviour of the app's custom dropdowns (TermPicker, ProfilePicker): the list
 * is drawn on the page body (`<Teleport to="body">`), so a modal's scrolling form can't clip
 * it, and placed under its box, or above when there isn't room, with its height fitted to
 * the visible screen (above a phone's keyboard). It follows scrolling, resizing and the
 * keyboard; it closes on a click outside, on Escape, and when another dropdown opens.
 *
 * The picker owns what's in the list and whether it's open; give it:
 * - `anchor`: the box the list hangs from; `panel`: the list's element (inside the Teleport)
 * - `open`: whether the list is showing; `close`: what to do to close it
 * - `maxHeight`: the list's height when there's room
 *
 * Bind the returned `style` to the panel element. Native `<select>` remains the default
 * where it's enough (AGENTS.md, Vue Frontend).
 */
export function useDropdownPanel(options: {
  anchor: Ref<HTMLElement | null>
  panel: Ref<HTMLElement | null>
  open: Ref<boolean>
  close: () => void
  maxHeight: number
}) {
  const { anchor, panel, open, close, maxHeight } = options
  const style = reactive<CSSProperties>({ position: 'fixed', zIndex: 1000, overflowY: 'auto' })

  function visibleArea(): VisibleArea {
    const vv = window.visualViewport
    return vv
      ? { top: vv.offsetTop, bottom: vv.offsetTop + vv.height, layoutHeight: window.innerHeight }
      : { top: 0, bottom: window.innerHeight, layoutHeight: window.innerHeight }
  }

  function update() {
    if (!open.value || !anchor.value) return
    const r = anchor.value.getBoundingClientRect()
    const p = placeDropdown(r, visibleArea(), maxHeight)
    style.top = p.top === undefined ? 'auto' : `${p.top}px`
    style.bottom = p.bottom === undefined ? 'auto' : `${p.bottom}px`
    style.left = `${p.left}px`
    style.width = `${p.width}px`
    style.maxHeight = `${p.maxHeight}px`
  }

  watch(open, isOpen => {
    if (!isOpen) return
    // Only one dropdown open at a time: tell the others.
    anchor.value?.dispatchEvent(new CustomEvent('dropdown-opened', { bubbles: true }))
    update()
    nextTick(update)
  })

  const isInside = (target: EventTarget | null) =>
    !!target && (anchor.value?.contains(target as Node) || panel.value?.contains(target as Node))

  function onDocClick(e: MouseEvent) {
    if (open.value && !isInside(e.target)) close()
  }
  function onKeydown(e: KeyboardEvent) {
    if (open.value && e.key === 'Escape') close()
  }
  function onOtherOpened(e: Event) {
    if (open.value && !anchor.value?.contains(e.target as Node)) close()
  }

  onMounted(() => {
    document.addEventListener('click', onDocClick)
    document.addEventListener('keydown', onKeydown)
    document.addEventListener('dropdown-opened', onOtherOpened)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    window.visualViewport?.addEventListener('resize', update)
    window.visualViewport?.addEventListener('scroll', update)
  })
  onUnmounted(() => {
    document.removeEventListener('click', onDocClick)
    document.removeEventListener('keydown', onKeydown)
    document.removeEventListener('dropdown-opened', onOtherOpened)
    window.removeEventListener('resize', update)
    window.removeEventListener('scroll', update, true)
    window.visualViewport?.removeEventListener('resize', update)
    window.visualViewport?.removeEventListener('scroll', update)
  })

  return { style, update }
}
