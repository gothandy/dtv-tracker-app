import type { SessionResponse } from '../../../types/api-responses'
import type { Session } from '../types/session'

export interface ProfileSessionFlags {
  sessionIds?: number[]
  regularGroupIds?: number[]
}

export function mapSession(
  r: SessionResponse,
  profileStats: ProfileSessionFlags | undefined,
): Session {
  return {
    id: r.id,
    date: r.date,
    groupId: r.groupId,
    groupKey: r.groupKey,
    groupName: r.groupName,
    groupDescription: r.groupDescription,
    displayName: r.displayName,
    description: r.description,
    financialYear: r.financialYear,
    isBookable: r.isBookable,
    limits: r.limits,
    stats: r.stats,
    regularsCount: r.regularsCount,
    mediaCount: r.mediaCount,
    coverUrl: r.coverUrl,
    metadata: r.metadata,
    projectId: r.projectId,
    projectKey: r.projectKey,
    projectTitle: r.projectTitle,
    isRegistered: profileStats?.sessionIds?.includes(r.id) ?? false,
    isAttended: !r.isBookable && (profileStats?.sessionIds?.includes(r.id) ?? false),
    isRegular: profileStats?.regularGroupIds?.includes(r.groupId ?? -1) ?? false,
  }
}
