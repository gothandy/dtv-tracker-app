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

/** The trail a project is at, from its tags (full paths): "Adit" for "XC:Adit:TNT". '' if none. */
export function trailName(tags: Array<{ label: string }> | undefined): string {
  const parts = tags?.map(t => t.label.split(':')).find(p => p.length >= 2)
  return parts ? parts[1] : ''
}
const round1 = (n: number) => Math.round(n * 10) / 10

/** Anything with tags (full paths): a project, with or without its session totals. */
type Tagged = { metadata?: Array<{ label: string }> }

const atLocation = (p: Tagged, path: string) => p.metadata?.some(m => isUnder(m.label, path)) ?? false

/**
 * The trails (locations) with none of these projects: the "No projects" trails shown on the
 * Projects page with *Include No projects*, and in its CSV. With a tag filter, only the trails
 * beneath it, or the one it's beneath; with "No tags", none.
 */
export function trailsWithoutProjects(projects: Tagged[], tree: TaxNode[], tagFilter: string): string[] {
  if (tagFilter === NO_TAGS) return []
  return locationTerms(tree)
    .filter(path => !tagFilter || isUnder(path, tagFilter) || isUnder(tagFilter, path))
    .filter(path => !projects.some(p => atLocation(p, path)))
}

type Timing = { state: 'None' | 'Future' | 'Past'; next: string; last: string }

/** Each project's sessions in time: none yet, still to come (next date), or all past (last date). */
function projectTiming(projects: Array<{ id: number }>, sessions: Session[], todayIso: string): Map<number, Timing> {
  return new Map(projects.map(p => {
    const dates = sessions.filter(s => s.projectId === p.id).map(s => s.date.slice(0, 10)).sort()
    const next = dates.find(d => d >= todayIso)
    const last = [...dates].reverse().find(d => d < todayIso)
    const state: Timing['state'] = !dates.length ? 'None' : next ? 'Future' : 'Past'
    return [p.id, { state, next: next ?? '', last: last ?? '' }]
  }))
}

const RANK = { None: 0, Future: 1, Past: 2 } as const
/** No sessions first, then future (soonest first), then past (latest first). */
function byTiming(timing: Map<number, Timing>) {
  return (a: { id: number }, b: { id: number }) => {
    const ta = timing.get(a.id)!, tb = timing.get(b.id)!
    if (ta.state !== tb.state) return RANK[ta.state] - RANK[tb.state]
    if (ta.state === 'Future') return ta.next.localeCompare(tb.next)
    if (ta.state === 'Past') return tb.last.localeCompare(ta.last)
    return 0
  }
}

export interface LocationGroup<P> {
  /** The trail ("XC:Adit"), or NO_LOCATION */
  path: string
  /** Its top-level term ("XC"); '' for NO_LOCATION */
  top: string
  /** Its projects, in timing order; none for a trail without projects */
  projects: P[]
}

/**
 * Projects grouped by location, in the term set's order: each trail with projects, and each
 * of `emptyTrails` (trailsWithoutProjects) in its place with none; then projects with no
 * location under NO_LOCATION. Within a trail: no sessions first, then future, then past.
 * Shared by the Projects page (Show all trails) and the Projects by location CSV.
 */
export function projectsByLocation<P extends Tagged & { id: number }>(
  projects: P[],
  sessions: Session[],
  tree: TaxNode[],
  emptyTrails: string[],
  todayIso: string = new Date().toISOString().slice(0, 10),
): LocationGroup<P>[] {
  const allLocations = locationTerms(tree)
  const empty = new Set(emptyTrails)
  const order = byTiming(projectTiming(projects, sessions, todayIso))
  const groups: LocationGroup<P>[] = allLocations.flatMap(path => {
    const here = projects.filter(p => atLocation(p, path))
    return here.length || empty.has(path) ? [{ path, top: path.split(':')[0], projects: [...here].sort(order) }] : []
  })
  const unlocated = projects.filter(p => !allLocations.some(path => atLocation(p, path)))
  if (unlocated.length) groups.push({ path: NO_LOCATION, top: '', projects: [...unlocated].sort(order) })
  return groups
}

/**
 * Projects by location, for a CSV of the projects selected on the Projects page: one row per
 * project, in projectsByLocation's order, with its trail ("Adit") and its own tag in full
 * ("XC:Adit:TNT"), whether it has documents, and its description. Each of `emptyTrails` gets
 * one "No projects" row in its place. Sessions and hours are for the page's FY.
 */
export function projectsByLocationRows(
  projects: LocationProject[],
  sessions: Session[],
  tree: TaxNode[],
  emptyTrails: string[],
  origin: string,
  todayIso: string = new Date().toISOString().slice(0, 10),
  /** Keys of the projects with documents (GET /api/projects/documents), for the Documents column */
  withDocuments: Set<string> = new Set(),
): Array<Array<string | number>> {
  const timing = projectTiming(projects, sessions, todayIso)
  /** The project's tag that puts it at this location, in full; for (No location), its tags as they are. */
  const tagAt = (p: LocationProject, path: string) => (path === NO_LOCATION
    ? p.metadata?.map(m => m.label) ?? []
    : p.metadata?.filter(m => isUnder(m.label, path)).map(m => m.label) ?? []).join(', ')

  return projectsByLocation(projects, sessions, tree, emptyTrails, todayIso).flatMap(({ path, top, projects: here }) => {
    const trail = path === NO_LOCATION ? '' : path.split(':')[1]
    if (!here.length) {
      // No link (the Projects page would be empty for it), and no sessions or hours to give.
      return [[path, top, trail, '', 'No projects', '', '', '', '', '', '', '', '', '']]
    }
    return here.map(p => {
      const t = timing.get(p.id)!
      return [
        path, top, trail, tagAt(p, path), p.displayName || p.key, p.status ?? '',
        p.sessionCount, round1(p.hours), withDocuments.has(p.key.toLowerCase()) ? 'Yes' : 'No',
        t.state, t.next, t.last,
        `${origin}/projects/${encodeURIComponent(p.key)}`,
        p.description ?? '',
      ]
    })
  })
}
