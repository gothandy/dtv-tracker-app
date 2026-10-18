import type { TaxNode } from '../composables/useTaxonomy'
import type { Session } from '../types/session'
import { NO_TAGS } from './tagFilter'

export interface LocationProject {
  id: number
  displayName?: string
  key: string
  status?: string
  metadata?: Array<{ label: string }>
  /** Sessions and hours for the FY chosen on the page */
  sessionCount: number
  hours: number
}

export const PROJECTS_BY_LOCATION_HEADERS = [
  'Row', 'Location', 'Top level', 'Tag', 'Project', 'Project status',
  'Sessions', 'Hours', 'Timing', 'Next session', 'Last session', 'Link',
]

/** Location label for projects with no location tag. */
export const NO_LOCATION = '(No location)'

/**
 * The locations: the term set's second-level tags (a trail, e.g. "DH:Corkscrew", "XC:Adit"),
 * as colon paths in the term set's order. A project tagged deeper ("XC:Adit:TNT") counts
 * at its trail; one tagged only at the top ("DH") isn't at a location.
 */
function locationTerms(nodes: TaxNode[]): string[] {
  return nodes.flatMap(top => (top.children ?? []).map(child => `${top.label}:${child.label}`))
}

const isUnder = (label: string, path: string) => label === path || label.startsWith(path + ':')
const round1 = (n: number) => Math.round(n * 10) / 10

/**
 * Projects by location, for a CSV. The locations are the term set's second-level tags
 * (locationTerms). For each location: a Location
 * row with the totals of its projects ("No projects" if none), then a Project row for each
 * with its own tag in full (e.g. "XC:Adit:TNT"),
 * no sessions first, then future (soonest first), then past (latest first). Projects with no
 * location tag go under "(No location)" at the end. With a tag filter, only the locations
 * beneath it, or the one it's beneath; with "No tags", just "(No location)". Sessions and hours are for the page's FY.
 */
export function projectsByLocationRows(
  projects: LocationProject[],
  sessions: Session[],
  tree: TaxNode[],
  tagFilter: string,
  origin: string,
  todayIso: string = new Date().toISOString().slice(0, 10),
): Array<Array<string | number>> {
  const allLocations = locationTerms(tree)
  const locations = tagFilter === NO_TAGS ? [] : allLocations.filter(path =>
    !tagFilter || isUnder(path, tagFilter) || isUnder(tagFilter, path))
  const atLocation = (p: LocationProject, path: string) => p.metadata?.some(m => isUnder(m.label, path)) ?? false
  /** The project's tag that puts it at this location, in full; for (No location), its tags as they are. */
  const tagAt = (p: LocationProject, path: string) => (path === NO_LOCATION
    ? p.metadata?.map(m => m.label) ?? []
    : p.metadata?.filter(m => isUnder(m.label, path)).map(m => m.label) ?? []).join(', ')

  const timing = new Map(projects.map(p => {
    const dates = sessions.filter(s => s.projectId === p.id).map(s => s.date.slice(0, 10)).sort()
    const next = dates.find(d => d >= todayIso)
    const last = [...dates].reverse().find(d => d < todayIso)
    const state: 'None' | 'Future' | 'Past' = !dates.length ? 'None' : next ? 'Future' : 'Past'
    return [p.id, { state, next: next ?? '', last: last ?? '' }]
  }))

  const RANK = { None: 0, Future: 1, Past: 2 } as const
  const byTiming = (a: LocationProject, b: LocationProject) => {
    const ta = timing.get(a.id)!, tb = timing.get(b.id)!
    if (ta.state !== tb.state) return RANK[ta.state] - RANK[tb.state]
    if (ta.state === 'Future') return ta.next.localeCompare(tb.next)   // soonest first
    if (ta.state === 'Past') return tb.last.localeCompare(ta.last)     // latest first
    return 0
  }

  const locationRows = (path: string, top: string, here: LocationProject[]) => {
    here = [...here].sort(byTiming)
    const sessionTotal = here.reduce((sum, p) => sum + p.sessionCount, 0)
    const hourTotal = round1(here.reduce((sum, p) => sum + p.hours, 0))
    const locationRow: Array<string | number> = [
      'Location', path, top, '',
      here.length ? `${here.length} project${here.length === 1 ? '' : 's'}` : 'No projects', '',
      sessionTotal, hourTotal, '', '', '',
      path === NO_LOCATION ? '' : `${origin}/projects?tag=${encodeURIComponent(path)}`,
    ]
    return [locationRow, ...here.map(p => {
      const t = timing.get(p.id)!
      return [
        'Project', path, top, tagAt(p, path), p.displayName || p.key, p.status ?? '',
        p.sessionCount, round1(p.hours), t.state, t.next, t.last,
        `${origin}/projects/${encodeURIComponent(p.key)}`,
      ]
    })]
  }

  const rows = locations.flatMap(path =>
    locationRows(path, path.split(':')[0], projects.filter(p => atLocation(p, path))))

  const unlocated = projects.filter(p => !allLocations.some(path => atLocation(p, path)))
  if (unlocated.length) rows.push(...locationRows(NO_LOCATION, '', unlocated))
  return rows
}
