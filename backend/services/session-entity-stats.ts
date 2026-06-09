/**
 * Live session totals for groups, projects, and similar scopes.
 */

import type { SharePointSession } from '../../types/session';
import { calculateCurrentFY, calculateFinancialYear, parseSessionStats, safeParseLookupId } from './data-layer';
import { GROUP_LOOKUP, PROJECT_LOOKUP, SESSION_STATS } from './field-names';

export type FyScope = 'current' | 'all';

export interface SessionScopeFilter {
  groupId?: number;
  projectId?: number;
}

export interface SessionCountHours {
  sessions: number;
  hours: number;
}

function sessionInScope(s: SharePointSession, scope: SessionScopeFilter): boolean {
  if (scope.groupId !== undefined) {
    return safeParseLookupId(s[GROUP_LOOKUP]) === scope.groupId;
  }
  if (scope.projectId !== undefined) {
    return safeParseLookupId(s[PROJECT_LOOKUP]) === scope.projectId;
  }
  return false;
}

function sessionInFyScope(s: SharePointSession, fyScope: FyScope): boolean {
  if (fyScope === 'all') return true;
  const fy = calculateCurrentFY();
  const fyStart = new Date(Date.UTC(fy.startYear, 3, 1));
  const fyEnd = new Date(Date.UTC(fy.endYear, 2, 31, 23, 59, 59));
  const d = new Date(s.Date!);
  return d >= fyStart && d <= fyEnd;
}

/** Sum session count and hours for sessions matching scope (and optional current FY). */
export function aggregateSessionStatsForScope(
  sessions: SharePointSession[],
  scope: SessionScopeFilter,
  options: { fyScope?: FyScope } = {}
): SessionCountHours {
  const fyScope = options.fyScope ?? 'current';
  let sessionsCount = 0;
  let hours = 0;

  for (const s of sessions) {
    if (!s.Date || !sessionInScope(s, scope)) continue;
    if (!sessionInFyScope(s, fyScope)) continue;
    const stats = parseSessionStats(s[SESSION_STATS] as string | undefined);
    sessionsCount += 1;
    hours += stats.hours;
  }

  return {
    sessions: sessionsCount,
    hours: Math.round(hours * 10) / 10,
  };
}

/** Client-aligned FY filter for list pages (all | future | rolling | FY2025). */
export function sessionMatchesFyFilter(
  sessionDate: string,
  sessionFinancialYear: string | undefined,
  fyFilter: string,
  todayIso: string = new Date().toISOString().slice(0, 10)
): boolean {
  if (fyFilter === 'all') return true;
  if (fyFilter === 'future') return sessionDate >= todayIso;
  if (fyFilter === 'rolling') {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    const start = d.toISOString().slice(0, 10);
    return sessionDate >= start && sessionDate <= todayIso;
  }
  if (sessionFinancialYear) return sessionFinancialYear === fyFilter;
  const fyYear = parseInt(fyFilter.replace('FY', ''), 10);
  if (!Number.isNaN(fyYear)) {
    return calculateFinancialYear(new Date(sessionDate)) === fyYear;
  }
  return true;
}
