/**
 * Sessions Repository
 *
 * Fetches Sessions (Events) data from SharePoint and returns typed SharePointSession[]
 */

import { SharePointSession } from '../../types/session';
import { sharePointClient } from '../sharepoint-client';
import { GROUP_LOOKUP, GROUP_DISPLAY, SESSION_NOTES, legacy } from '../field-names';

class SessionsRepository {
  private listGuid: string;

  constructor() {
    this.listGuid = process.env.SESSIONS_LIST_GUID!;
  }

  private get selectFields(): string {
    const base = `ID,Title,Name,Date,${SESSION_NOTES},EventbriteEventID,${GROUP_DISPLAY},${GROUP_LOOKUP},Created,Modified`;
    // Legacy site has extra columns not on the Tracker site
    return legacy ? `${base},Registrations,Hours,FinancialYearFlow,Url` : base;
  }

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
      null  // TODO: Graph API orderby on this list returns 400 - sorting done in data layer instead
    );
    sharePointClient.cache.set(cacheKey, data);
    return data as SharePointSession[];
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
    const id = await sharePointClient.createListItem(this.listGuid, fields);
    sharePointClient.cache.del('sessions');
    return id;
  }

  async updateFields(sessionId: number, fields: Record<string, any>): Promise<void> {
    await sharePointClient.updateListItem(this.listGuid, sessionId, fields);
    sharePointClient.cache.del('sessions');
  }
}

export const sessionsRepository = new SessionsRepository();
