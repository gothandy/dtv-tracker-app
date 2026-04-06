export function belowBreakpointMd(): boolean {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--breakpoint-md').trim()
  return window.matchMedia(`(width < ${value})`).matches
}
