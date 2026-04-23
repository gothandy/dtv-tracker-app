export function useViewportHeight() {
  function update() {
    const vvHeight = window.visualViewport?.height ?? window.innerHeight
    const keyboardHeight = Math.max(0, window.innerHeight - vvHeight)
    document.documentElement.style.setProperty('--viewport-height', `${vvHeight}px`)
    document.documentElement.style.setProperty('--keyboard-height', `${keyboardHeight}px`)
  }
  update()
  window.visualViewport?.addEventListener('resize', update)
}
