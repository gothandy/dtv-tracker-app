export async function shareCurrentUrl(): Promise<void> {
  const url = window.location.href
  if (navigator.share) {
    await navigator.share({ url })
  } else {
    await navigator.clipboard.writeText(url)
  }
}
