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
  'Row', 'Location', 'Top level', 'Level', 'Project', 'Project status',
  'Sessions', 'Hours', 'Timing', 'Next session', 'Last session', 'Link',
]

/** Location label for projects with no leaf (location) tag. */
export const NO_LOCATION = '(No location)'

/** The term set's leaf tags (the locations) as colon paths, in the term set's order, with their depth (1 = top). */
function leafTerms(nodes: TaxNode[], prefix = '', level = 1): Array<{ path: string; level: number }> {
  return nodes.flatMap(node => {
    const path = prefix ? `${prefix}:${node.label}` : node.label
    return node.children?.length ? leafTerms(node.children, path, level + 1) : [{ path, level }]
  })
}

const isUnder = (label: string, path: string) => label === path || label.startsWith(path + ':')
const round1 = (n: number) => Math.round(n * 10) / 10

/**
 * Projects by location, for a CSV. The locations are the term set's leaf tags; a project
 * tagged only higher up (e.g. just "DH") isn't at a location. For each location: a Location
 * row with the totals of its projects ("No projects" if none), then a Project row for each,
 * no sessions first, then future (soonest first), then past (latest first). Projects with no
 * location tag go under "(No location)" at the end. With a tag filter, only the locations
 * beneath it; with "No tags", just "(No location)". Sessions and hours are for the page's FY.
 */
export function projectsByLocationRows(
  projects: LocationProject[],
  sessions: Session[],
  tree: TaxNode[],
  tagFilter: string,
  origin: string,
  todayIso: string = new Date().toISOString().slice(0, 10),
): Array<Array<string | number>> {
  const allLeaves = leafTerms(tree)
  const leaves = tagFilter === NO_TAGS ? [] : allLeaves.filter(t => !tagFilter || isUnder(t.path, tagFilter))
  const atLocation = (p: LocationProject, path: string) => p.metadata?.some(m => isUnder(m.label, path)) ?? false

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

  const locationRows = (path: string, top: string, level: number | string, here: LocationProject[]) => {
    here = [...here].sort(byTiming)
    const sessionTotal = here.reduce((sum, p) => sum + p.sessionCount, 0)
    const hourTotal = round1(here.reduce((sum, p) => sum + p.hours, 0))
    const locationRow: Array<string | number> = [
      'Location', path, top, level,
      here.length ? `${here.length} project${here.length === 1 ? '' : 's'}` : 'No projects', '',
      sessionTotal, hourTotal, '', '', '',
      path === NO_LOCATION ? '' : `${origin}/projects?tag=${encodeURIComponent(path)}`,
    ]
    return [locationRow, ...here.map(p => {
      const t = timing.get(p.id)!
      return [
        'Project', path, top, level, p.displayName || p.key, p.status ?? '',
        p.sessionCount, round1(p.hours), t.state, t.next, t.last,
        `${origin}/projects/${encodeURIComponent(p.key)}`,
      ]
    })]
  }

  const rows = leaves.flatMap(({ path, level }) =>
    locationRows(path, path.split(':')[0], level, projects.filter(p => atLocation(p, path))))

  const unlocated = projects.filter(p => !allLeaves.some(l => atLocation(p, l.path)))
  if (unlocated.length) rows.push(...locationRows(NO_LOCATION, '', '', unlocated))
  return rows
}
