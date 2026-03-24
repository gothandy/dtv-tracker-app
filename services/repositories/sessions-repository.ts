/**
 * Sessions Repository
 *
 * Fetches Sessions (Events) data from SharePoint and returns typed SharePointSession[]
 */

import { SharePointSession } from '../../types/session';
import { sharePointClient, CACHE_TTL } from '../sharepoint-client';
import { GROUP_LOOKUP, GROUP_DISPLAY, SESSION_NOTES, SESSION_METADATA, SESSION_COVER_MEDIA, SESSION_STATS } from '../field-names';

const SLUG_CACHE_TTL = 3600; // 1 hour — group+date→ID mappings are stable

class SessionsRepository {
  private listGuid: string;

  constructor() {
    this.listGuid = process.env.SESSIONS_LIST_GUID!;
  }

  private get selectFields(): string {
    return `ID,Title,Name,Date,${SESSION_NOTES},${SESSION_METADATA},EventbriteEventID,${GROUP_DISPLAY},${GROUP_LOOKUP},${SESSION_COVER_MEDIA},${SESSION_STATS},Created,Modified`;
  }

  private readonly dateOnlyFields = ['Date'];

  async getAll(): Promise<SharePointSession[]> {
    const cacheKey = 'sessions';
    const cached = sharePointClient.cache.get(cacheKey);
    if (cached) {
      console.log(`[Cache] Hit: ${cacheKey}`);
      return cached as SharePointSession[];
    }

    console.log(`[Cache] Miss: ${cacheKey} - fetching from SharePoint`);
    const data = await sharePointClient.getListItems(
      this.listGuid,
      this.selectFields,
      null,
      null,  // TODO: Graph API orderby on this list returns 400 - sorting done in data layer instead
      this.dateOnlyFields
    );
    sharePointClient.cache.set(cacheKey, data, CACHE_TTL.sessions);
    this.populateSlugCache(data as SharePointSession[]);
    return data as SharePointSession[];
  }

  /** Populate slug lookup entries from a set of sessions. Called after every getAll(). */
  private populateSlugCache(sessions: SharePointSession[]): void {
    for (const s of sessions) {
      const groupTitle = (s[GROUP_DISPLAY] || '').toLowerCase();
      if (groupTitle && s.Date && s.ID) {
        sharePointClient.cache.set(`session_slug_${groupTitle}_${s.Date}`, s.ID, SLUG_CACHE_TTL);
      }
    }
  }

  /**
   * Resolve a session by group key + date using a long-TTL slug lookup cache.
   * On cache hit: one targeted getById() Graph call.
   * On cache miss: one targeted OData query by exact Title — Title is always "${date} ${groupTitle}"
   * and OData eq on text is case-insensitive, so '2026-03-15 sat' matches "2026-03-15 Sat".
   * Returns null (→ 404) if not found — no getAll() fallback.
   */
  async getBySlug(groupKey: string, date: string): Promise<SharePointSession | null> {
    const slugKey = `session_slug_${groupKey.toLowerCase()}_${date}`;
    const cachedId = sharePointClient.cache.get<number>(slugKey);
    if (cachedId !== undefined) {
      console.log(`[Cache] Hit: ${slugKey}`);
      return await this.getById(cachedId);
    }

    // Miss — exact title lookup: one Graph call, returns ≤1 session
    const filter = `fields/Title eq '${date} ${groupKey}'`;
    const results = await sharePointClient.getListItems(
      this.listGuid, this.selectFields, filter, null, this.dateOnlyFields
    ) as SharePointSession[];

    const session = results[0] ?? null;
    if (session) {
      sharePointClient.cache.set(slugKey, session.ID, SLUG_CACHE_TTL);
    }
    return session;
  }

  async getById(id: number): Promise<SharePointSession | null> {
    const cacheKey = `session_item_${id}`;
    const cached = sharePointClient.cache.get<SharePointSession>(cacheKey);
    if (cached !== undefined) {
      console.log(`[Cache] Hit: ${cacheKey}`);
      return cached;
    }
    const item = await sharePointClient.getListItem(
      this.listGuid, id, this.selectFields, this.dateOnlyFields
    ) as SharePointSession | null;
    if (item !== null) {
      sharePointClient.cache.set(cacheKey, item, CACHE_TTL.sessions);
    }
    return item;
  }

  async getByFinancialYear(fy: string): Promise<SharePointSession[]> {
    const cacheKey = `sessions_${fy}`;
    const cached = sharePointClient.cache.get(cacheKey);
    if (cached) {
      console.log(`[Cache] Hit: ${cacheKey}`);
      return cached as SharePointSession[];
    }

    console.log(`[Cache] Miss: ${cacheKey} - fetching from SharePoint`);
    // Fetch all sessions and filter in Node.js (SharePoint filter on FinancialYearFlow fails)
    const allSessions = await this.getAll();

    // Parse FY to get date range: FY2025 -> April 1, 2025 to March 31, 2026
    const fyStartYear = parseInt(fy.substring(2));
    const fyEndYear = fyStartYear + 1;
    const fyStartDate = new Date(Date.UTC(fyStartYear, 3, 1)); // April 1
    const fyEndDate = new Date(Date.UTC(fyEndYear, 2, 31, 23, 59, 59)); // March 31

    const filteredData = allSessions.filter(session => {
      if (!session.Date) return false;
      const sessionDate = new Date(session.Date);
      return sessionDate >= fyStartDate && sessionDate <= fyEndDate;
    });

    console.log(`[SessionsByFY] Filtered ${filteredData.length} sessions for ${fy} from ${allSessions.length} total`);
    sharePointClient.cache.set(cacheKey, filteredData, CACHE_TTL.sessions);
    return filteredData;
  }

  async create(fields: { Title: string; Date: string; [key: string]: any }): Promise<number> {
    const id = await sharePointClient.createListItem(this.listGuid, fields, this.dateOnlyFields);
    sharePointClient.clearCacheKey('sessions');
    sharePointClient.clearCacheByPrefix('sessions_FY');
    sharePointClient.clearCacheByPrefix('session_slug_');
    return id;
  }

  async updateFields(sessionId: number, fields: Record<string, any>): Promise<void> {
    await sharePointClient.updateListItem(this.listGuid, sessionId, fields, this.dateOnlyFields);
    sharePointClient.clearCacheKey('sessions');
    sharePointClient.clearCacheKey(`session_item_${sessionId}`);
    sharePointClient.clearCacheByPrefix('sessions_FY');
    sharePointClient.clearCacheByPrefix('session_slug_');
  }

  // Updates only the Stats field — clears sessions cache only (not full flush).
  // Bulk refresh callers (session-stats.ts) call clearCacheKey('sessions') once after the loop instead.
  async updateStats(sessionId: number, stats: Record<string, any>): Promise<void> {
    await sharePointClient.updateListItem(this.listGuid, sessionId, { [SESSION_STATS]: JSON.stringify(stats) });
    sharePointClient.clearCacheKey('sessions');
    sharePointClient.clearCacheByPrefix('sessions_FY');
    // Slug entries are not affected by stats-only updates — no slug clear needed here
  }

  async delete(sessionId: number): Promise<void> {
    await sharePointClient.deleteListItem(this.listGuid, sessionId);
    sharePointClient.clearCacheKey('sessions');
    sharePointClient.clearCacheKey(`session_item_${sessionId}`);
    sharePointClient.clearCacheByPrefix('sessions_FY');
    sharePointClient.clearCacheByPrefix('session_slug_');
  }
}

export const sessionsRepository = new SessionsRepository();
