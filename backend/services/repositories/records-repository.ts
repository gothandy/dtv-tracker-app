/**
 * Records Repository
 *
 * Fetches Records from SharePoint, each with the State its lookup points at attached (Records v2,
 * #322), so the rest of the app reads a Record's Type and State through records.ts, never a column.
 */

import { SharePointRecord } from '../../../types/sharepoint';
import { recordsForProfile } from '../records';
import { sharePointClient, CACHE_TTL } from '../sharepoint-client';
import { sharePoint } from '../../config';
import { RECORD_NOTES, RECORD_STATE_LOOKUP } from '../field-names';
import { statesRepository } from './states-repository';
import { safeParseLookupId } from '../data-layer';

class RecordsRepository {
  private get listGuid(): string { return sharePoint.lists.records; }

  private get selectFields(): string {
    // Type and Status are still read for the Records Migration and Summary until they're removed (#323)
    return `ID,Title,Profile,ProfileLookupId,${RECORD_STATE_LOOKUP},Type,Status,Date,${RECORD_NOTES},Created,Modified`;
  }

  private readonly dateOnlyFields = ['Date'];

  /** Every Record, with its State attached (States are cached separately, so an edit there shows soon). */
  async getAll(): Promise<SharePointRecord[]> {
    const [records, states] = await Promise.all([this.getRaw(), statesRepository.getStates()]);
    const byId = new Map(states.map(s => [s.id, s]));
    return records.map(r => {
      const stateId = safeParseLookupId(r.StateLookupId as unknown as string);
      return { ...r, State: stateId !== undefined ? byId.get(stateId) : undefined };
    });
  }

  private async getRaw(): Promise<SharePointRecord[]> {
    const cacheKey = 'records';
    const cached = sharePointClient.cache.get(cacheKey);
    if (cached) {
      console.log(`[Cache] Hit: ${cacheKey}`);
      return cached as SharePointRecord[];
    }

    console.log(`[Cache] Miss: ${cacheKey} - fetching from SharePoint`);
    const data = await sharePointClient.getListItems(
      this.listGuid,
      this.selectFields,
      null,
      null,
      this.dateOnlyFields
    );
    sharePointClient.cache.set(cacheKey, data, CACHE_TTL.records);
    return data as SharePointRecord[];
  }

  async getByProfile(profileId: number): Promise<SharePointRecord[]> {
    const all = await this.getAll();
    return recordsForProfile(all, profileId);
  }

  async create(fields: { ProfileLookupId: number; StateLookupId: number; Type: string; Status: string; Date: string }): Promise<number> {
    const id = await sharePointClient.createListItem(this.listGuid, fields, this.dateOnlyFields);
    sharePointClient.clearCacheKey('records');
    return id;
  }

  async update(itemId: number, fields: { StateLookupId?: number; Status?: string; Date?: string; Notes?: string }): Promise<void> {
    await sharePointClient.updateListItem(this.listGuid, itemId, fields, this.dateOnlyFields);
    sharePointClient.clearCacheKey('records');
  }

  async delete(itemId: number): Promise<void> {
    await sharePointClient.deleteListItem(this.listGuid, itemId);
    sharePointClient.clearCacheKey('records');
  }
}

export const recordsRepository = new RecordsRepository();
