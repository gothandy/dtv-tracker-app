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

/** Every tag in the term set as a colon path, in the term set's order, with its depth (1 = top). */
function flattenTerms(nodes: TaxNode[], prefix = '', level = 1): Array<{ path: string; level: number }> {
  return nodes.flatMap(node => {
    const path = prefix ? `${prefix}:${node.label}` : node.label
    return [{ path, level }, ...flattenTerms(node.children ?? [], path, level + 1)]
  })
}

const isUnder = (label: string, path: string) => label === path || label.startsWith(path + ':')
const round1 = (n: number) => Math.round(n * 10) / 10

/**
 * Projects by location, for a CSV. For each tag: a Location row with the totals of its
 * projects, then a Project row for each. A project counts for its own tags and every tag
 * above them; a tag with no projects has a Location row saying "No projects". Projects run
 * no sessions first, then future (soonest first), then past (latest first). With a tag
 * filter, only that tag and the tags beneath it. Sessions and hours are for the page's FY.
 */
export function projectsByLocationRows(
  projects: LocationProject[],
  sessions: Session[],
  tree: TaxNode[],
  tagFilter: string,
  origin: string,
  todayIso: string = new Date().toISOString().slice(0, 10),
): Array<Array<string | number>> {
  const terms = flattenTerms(tree).filter(t => !tagFilter || tagFilter === NO_TAGS || isUnder(t.path, tagFilter))

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

  return terms.flatMap(({ path, level }) => {
    const top = path.split(':')[0]
    const here = projects.filter(p => p.metadata?.some(m => isUnder(m.label, path))).sort(byTiming)
    const sessionTotal = here.reduce((sum, p) => sum + p.sessionCount, 0)
    const hourTotal = round1(here.reduce((sum, p) => sum + p.hours, 0))
    const locationRow = [
      'Location', path, top, level,
      here.length ? `${here.length} project${here.length === 1 ? '' : 's'}` : 'No projects', '',
      sessionTotal, hourTotal, '', '', '',
      `${origin}/projects?tag=${encodeURIComponent(path)}`,
    ]
    return [locationRow, ...here.map(p => {
      const t = timing.get(p.id)!
      return [
        'Project', path, top, level, p.displayName || p.key, p.status ?? '',
        p.sessionCount, round1(p.hours), t.state, t.next, t.last,
        `${origin}/projects/${encodeURIComponent(p.key)}`,
      ]
    })]
  })
}
