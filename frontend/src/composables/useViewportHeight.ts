export function useViewportHeight() {
  function update() {
    const h = window.visualViewport?.height ?? window.innerHeight
    document.documentElement.style.setProperty('--viewport-height', `${h}px`)
  }
  update()
  window.visualViewport?.addEventListener('resize', update)
}
