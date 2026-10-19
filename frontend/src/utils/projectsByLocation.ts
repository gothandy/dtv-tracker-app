import type { TaxNode } from '../composables/useTaxonomy'
import type { Session } from '../types/session'
import { NO_TAGS } from './tagFilter'

export interface LocationProject {
  id: number
  displayName?: string
  key: string
  status?: string
  description?: string
  metadata?: Array<{ label: string }>
  /** Sessions and hours for the FY chosen on the page */
  sessionCount: number
  hours: number
}

export const PROJECTS_BY_LOCATION_HEADERS = [
  'Location', 'Top level', 'Trail', 'Tag', 'Project', 'Project status',
  'Sessions', 'Hours', 'Documents', 'Timing', 'Next session', 'Last session', 'Link', 'Description',
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
 * Projects by location, for a CSV: one row per project, by location (the term set's
 * second-level tags, locationTerms), with its trail ("Adit") and its own tag in full
 * ("XC:Adit:TNT"), whether it has documents, and its description. Within a location: no sessions first, then future (soonest first), then
 * past (latest first). A location with no projects gets one "No projects" row. Projects with
 * no location tag go under "(No location)" at the end. With a tag filter, only the locations
 * beneath it, or the one it's beneath; with "No tags", just "(No location)". Sessions and
 * hours are for the page's FY.
 */
export function projectsByLocationRows(
  projects: LocationProject[],
  sessions: Session[],
  tree: TaxNode[],
  tagFilter: string,
  origin: string,
  todayIso: string = new Date().toISOString().slice(0, 10),
  /** Keys of the projects with documents (GET /api/projects/documents), for the Documents column */
  withDocuments: Set<string> = new Set(),
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

  const locationRows = (path: string, here: LocationProject[]): Array<Array<string | number>> => {
    const [top, trail] = path === NO_LOCATION ? ['', ''] : path.split(':')
    if (!here.length) {
      // No link: the Projects page would be empty for it.
      return [[path, top, trail, '', 'No projects', '', 0, 0, '', '', '', '', '', '']]
    }
    return [...here].sort(byTiming).map(p => {
      const t = timing.get(p.id)!
      return [
        path, top, trail, tagAt(p, path), p.displayName || p.key, p.status ?? '',
        p.sessionCount, round1(p.hours), withDocuments.has(p.key.toLowerCase()) ? 'Yes' : 'No',
        t.state, t.next, t.last,
        `${origin}/projects/${encodeURIComponent(p.key)}`,
        p.description ?? '',
      ]
    })
  }

  const rows = locations.flatMap(path => locationRows(path, projects.filter(p => atLocation(p, path))))

  const unlocated = projects.filter(p => !allLocations.some(path => atLocation(p, path)))
  if (unlocated.length) rows.push(...locationRows(NO_LOCATION, unlocated))
  return rows
}
