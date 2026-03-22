/**
 * Sessions Repository
 *
 * Fetches Sessions (Events) data from SharePoint and returns typed SharePointSession[]
 */

import { SharePointSession } from '../../types/session';
import { sharePointClient } from '../sharepoint-client';
import { GROUP_LOOKUP, GROUP_DISPLAY, SESSION_NOTES, SESSION_METADATA, SESSION_COVER_MEDIA, SESSION_STATS } from '../field-names';

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
    sharePointClient.cache.set(cacheKey, data);
    return data as SharePointSession[];
  }

  async getById(id: number): Promise<SharePointSession | null> {
    return await sharePointClient.getListItem(this.listGuid, id, this.selectFields, this.dateOnlyFields) as SharePointSession | null;
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
    sharePointClient.cache.set(cacheKey, filteredData);
    return filteredData;
  }

  async create(fields: { Title: string; Date: string; [key: string]: any }): Promise<number> {
    const id = await sharePointClient.createListItem(this.listGuid, fields, this.dateOnlyFields);
    sharePointClient.clearCache();
    return id;
  }

  async updateFields(sessionId: number, fields: Record<string, any>): Promise<void> {
    await sharePointClient.updateListItem(this.listGuid, sessionId, fields, this.dateOnlyFields);
    sharePointClient.clearCache();
  }

  // Updates only the Stats field — clears sessions cache only (not full flush).
  // Bulk refresh callers (session-stats.ts) call clearCacheKey('sessions') once after the loop instead.
  async updateStats(sessionId: number, stats: Record<string, any>): Promise<void> {
    await sharePointClient.updateListItem(this.listGuid, sessionId, { [SESSION_STATS]: JSON.stringify(stats) });
    sharePointClient.clearCacheKey('sessions');
  }

  async delete(sessionId: number): Promise<void> {
    await sharePointClient.deleteListItem(this.listGuid, sessionId);
    sharePointClient.clearCache();
  }
}

export const sessionsRepository = new SessionsRepository();
