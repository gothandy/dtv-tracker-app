export interface LabelIcon {
  icon: string
  alt: string
  type: 'badge' | 'tag'
  color?: string
  subdued?: boolean
  activeLabel?: string     // alt text suffix when label is active, e.g. "On Duty"
  labelKey?: string        // EntryLabel value this picker button toggles
}

export const LABEL_ICONS: LabelIcon[] = [
  // Badges (profile-level indicators)
  { icon: 'badges/member.svg',  alt: 'Charity Member',   type: 'badge' },
  { icon: 'badges/card.svg',    alt: 'Benefits Card',     type: 'badge' },
  { icon: 'badges/card.svg',    alt: 'Card In Container', type: 'badge', color: 'orange' },
  { icon: 'badges/group.svg',   alt: 'Group / Company',   type: 'badge' },

  // Entry tags — displayed from labels / derived fields; editable ones also appear in the picker
  { icon: 'badges/child.svg',      alt: 'Child',          type: 'tag' },
  { icon: 'badges/diglead.svg',    alt: 'Dig Lead',       type: 'tag', labelKey: 'DigLead' },
  { icon: 'badges/firstaider.svg', alt: 'First Aider',    type: 'tag', color: 'green', labelKey: 'FirstAider', activeLabel: 'On Duty' },
  { icon: 'badges/csr.svg',        alt: 'CSR',            type: 'tag', labelKey: 'CSR' },
  { icon: 'badges/late.svg',       alt: 'Late',           type: 'tag', labelKey: 'Late' },
  { icon: 'brands/eventbrite.svg', alt: 'Eventbrite',     type: 'tag' },
  { icon: 'badges/regular.svg',    alt: 'Regular',        type: 'tag' },
  { icon: 'badges/new.svg',        alt: 'New',            type: 'tag' },
  { icon: 'badges/nophoto.svg',    alt: 'No Photo',       type: 'tag', color: 'red' },
  { icon: 'status/warning.svg',    alt: 'Profile Warning', type: 'badge', color: 'red' },
]

/** Tags shown in the entry label picker (manual labels only) */
export const EDITABLE_LABEL_ICONS = LABEL_ICONS.filter(t => t.labelKey !== undefined)

interface EntryIconSource {
  isMember?: boolean
  isGroup?: boolean
  cardStatus?: string
  labels?: string[]
  isChild?: boolean
  hasProfileWarning?: boolean
  eventbriteAttendeeId?: string
  isNew?: boolean               // profile.stats.sessionIds[0] === sessionId
  noPhoto?: boolean             // profile.stats.noPhoto (always current)
  isFirstAiderAvailable?: boolean  // profile.stats.isFirstAider
}

/** Builds the full icon list for an entry: profile badges + derived badges + labels */
export function iconsForEntry(e: EntryIconSource): LabelIcon[] {
  const icons: LabelIcon[] = []
  const labels = e.labels ?? []

  // Profile-level badges (always from profile fields)
  if (e.isMember) icons.push({ icon: 'badges/member.svg', alt: 'Charity Member', type: 'badge' })
  if (e.cardStatus === 'Accepted') icons.push({ icon: 'badges/card.svg', alt: 'Benefits Card', type: 'badge' })
  if (e.cardStatus === 'Invited')  icons.push({ icon: 'badges/card.svg', alt: 'Card Invited', type: 'badge', color: 'orange' })
  if (e.isGroup) icons.push({ icon: 'badges/group.svg', alt: 'Group / Company', type: 'badge' })
  if (e.hasProfileWarning) icons.push({ icon: 'status/warning.svg', alt: 'Profile Warning', type: 'badge', color: 'red' })

  // Derived entry badges (from native fields)
  if (e.isChild) icons.push({ icon: 'badges/child.svg', alt: 'Child', type: 'tag' })
  if (e.eventbriteAttendeeId) icons.push({ icon: 'brands/eventbrite.svg', alt: 'Eventbrite', type: 'tag' })

  // Derived from profile.stats
  if (e.isNew) icons.push({ icon: 'badges/new.svg', alt: 'New', type: 'tag' })
  if (e.noPhoto) icons.push({ icon: 'badges/nophoto.svg', alt: 'No Photo', type: 'tag', color: 'red' })

  // Labels (stored on entry)
  if (labels.includes('Regular')) icons.push({ icon: 'badges/regular.svg', alt: 'Regular', type: 'tag' })

  // FirstAider: dual-state — available (subdued) or on duty (from label)
  const faOnDuty = labels.includes('FirstAider')
  if (faOnDuty) {
    icons.push({ icon: 'badges/firstaider.svg', alt: 'First Aider (On Duty)', type: 'tag', color: 'green' })
  } else if (e.isFirstAiderAvailable) {
    icons.push({ icon: 'badges/firstaider.svg', alt: 'First Aider (Certified)', type: 'tag', subdued: true })
  }

  if (labels.includes('DigLead'))   icons.push({ icon: 'badges/diglead.svg', alt: 'Dig Lead', type: 'tag' })
  if (labels.includes('CSR'))       icons.push({ icon: 'badges/csr.svg', alt: 'CSR', type: 'tag' })
  if (labels.includes('Late'))      icons.push({ icon: 'badges/late.svg', alt: 'Late', type: 'tag' })

  return icons
}
