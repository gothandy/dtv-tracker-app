/**
 * Profiles Repository
 *
 * Fetches Profiles (Volunteers) data from SharePoint and returns typed SharePointProfile[]
 */

import { SharePointProfile } from '../../types/sharepoint';
import { sharePointClient } from '../sharepoint-client';
import { legacy } from '../field-names';

class ProfilesRepository {
  private listGuid: string;

  constructor() {
    this.listGuid = process.env.PROFILES_LIST_GUID!;
  }

  async getAll(): Promise<SharePointProfile[]> {
    const cacheKey = 'profiles';
    const cached = sharePointClient.cache.get(cacheKey);
    if (cached) {
      console.log(`[Cache] Hit: ${cacheKey}`);
      return cached as SharePointProfile[];
    }

    const base = 'ID,Title,Email,MatchName,IsGroup,Created,Modified';
    const selectFields = legacy ? `${base},HoursLastFY,HoursThisFY` : base;

    console.log(`[Cache] Miss: ${cacheKey} - fetching from SharePoint`);
    const data = await sharePointClient.getListItems(
      this.listGuid,
      selectFields
    );
    sharePointClient.cache.set(cacheKey, data);
    return data as SharePointProfile[];
  }

  async create(fields: { Title: string; Email?: string }): Promise<number> {
    const id = await sharePointClient.createListItem(this.listGuid, fields);
    sharePointClient.cache.del('profiles');
    return id;
  }

  async delete(profileId: number): Promise<void> {
    await sharePointClient.deleteListItem(this.listGuid, profileId);
    sharePointClient.cache.del('profiles');
  }

  async updateFields(profileId: number, fields: Partial<Pick<SharePointProfile, 'Title' | 'Email' | 'MatchName' | 'IsGroup'>>): Promise<void> {
    await sharePointClient.updateListItem(this.listGuid, profileId, fields);
    sharePointClient.cache.del('profiles');
  }
}

export const profilesRepository = new ProfilesRepository();
