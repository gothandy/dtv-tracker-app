import { watchEffect, toValue, type MaybeRefOrGetter } from 'vue'

export function usePageTitle(title: MaybeRefOrGetter<string>) {
  watchEffect(() => {
    const t = toValue(title)
    if (t) document.title = `${t} | DTV Tracker`
  })
}
