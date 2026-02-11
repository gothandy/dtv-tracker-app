/**
 * Sessions Repository
 *
 * Fetches Sessions (Events) data from SharePoint and returns typed SharePointSession[]
 */

import { SharePointSession } from '../../types/session';
import { sharePointClient } from '../sharepoint-client';

class SessionsRepository {
  private listGuid: string;

  constructor() {
    this.listGuid = process.env.SESSIONS_LIST_GUID!;
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
      'ID,Title,Name,Date,Description,Registrations,Hours,FinancialYearFlow,EventbriteEventID,Url,Crew,CrewLookupId,Created,Modified',
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

    // Filter with fallback: use FinancialYearFlow if set, otherwise use Date field
    const filteredData = allSessions.filter(session => {
      if (session.FinancialYearFlow) {
        return session.FinancialYearFlow === fy;
      } else if (session.Date) {
        const sessionDate = new Date(session.Date);
        return sessionDate >= fyStartDate && sessionDate <= fyEndDate;
      }
      return false;
    });

    console.log(`[SessionsByFY] Filtered ${filteredData.length} sessions for ${fy} from ${allSessions.length} total`);
    sharePointClient.cache.set(cacheKey, filteredData);
    return filteredData;
  }

  async updateFields(sessionId: number, fields: Partial<Pick<SharePointSession, 'Name' | 'Description'>>): Promise<void> {
    await sharePointClient.updateListItem(this.listGuid, sessionId, fields);
    sharePointClient.cache.del('sessions');
  }
}

export const sessionsRepository = new SessionsRepository();
