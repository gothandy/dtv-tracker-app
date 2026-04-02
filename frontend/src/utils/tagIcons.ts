// Ported from public/js/tag-icons.js

export interface TagIcon {
  icon: string
  alt: string
  type: 'badge' | 'tag'
  tag?: string       // hashtag to match in entry.notes, e.g. '#New'
  color?: string     // css modifier: 'orange' | 'red' | 'dark-green'
}

export const TAG_ICONS: TagIcon[] = [
  // Badges (profile-level indicators)
  { icon: 'member.svg',  alt: 'Charity Member',    type: 'badge' },
  { icon: 'card.svg',    alt: 'Benefits Card',      type: 'badge' },
  { icon: 'card.svg',    alt: 'Card In Container',  type: 'badge', color: 'orange' },
  { icon: 'group.svg',   alt: 'Group / Company',    type: 'badge' },

  // Entry tags (matched from notes)
  { icon: 'child.svg',      alt: 'Child',            tag: '#Child',      type: 'tag' },
  { icon: 'regular.svg',    alt: 'Regular',          tag: '#Regular',    type: 'tag' },
  { icon: 'new.svg',        alt: 'New',              tag: '#New',        type: 'tag' },
  { icon: 'diglead.svg',    alt: 'Dig Lead',         tag: '#DigLead',    type: 'tag' },
  { icon: 'firstaider.svg', alt: 'First Aider',      tag: '#FirstAider', type: 'tag', color: 'green' },
  { icon: 'csr.svg',        alt: 'CSR',              tag: '#CSR',        type: 'tag' },
  { icon: 'late.svg',       alt: 'Late',             tag: '#Late',       type: 'tag' },
  { icon: 'nophoto.svg',    alt: 'No Photo',         tag: '#NoPhoto',    type: 'tag', color: 'red' },
  { icon: 'eventbrite.svg', alt: 'Eventbrite',       tag: '#Eventbrite', type: 'tag' },
  { icon: 'warning.svg',    alt: 'Duplicate Warning',tag: '#Duplicate',  type: 'tag', color: 'red' },
]

/** Returns tag icons matched from an entry's notes string */
export function iconsFromNotes(notes: string | undefined): TagIcon[] {
  if (!notes) return []
  return TAG_ICONS.filter(t =>
    t.tag && new RegExp(t.tag.replace('#', '#'), 'i').test(notes)
  )
}
