/**
 * Templates Repository: email templates, edited by Admins directly in SharePoint.
 */

import { SharePointTemplate, TemplateContext } from '../../../types/email-template';
import { sharePointClient, CACHE_TTL } from '../sharepoint-client';
import { sharePoint } from '../../config';

class TemplatesRepository {
  private get listGuid(): string { return sharePoint.lists.templates; }

  async getAll(): Promise<SharePointTemplate[]> {
    const cacheKey = 'templates';
    const cached = sharePointClient.cache.get(cacheKey);
    if (cached) {
      console.log(`[Cache] Hit: ${cacheKey}`);
      return cached as SharePointTemplate[];
    }

    console.log(`[Cache] Miss: ${cacheKey} - fetching from SharePoint`);
    const data = await sharePointClient.getListItems(this.listGuid, 'ID,Title,Context,Subject,HTML,Text');
    sharePointClient.cache.set(cacheKey, data, CACHE_TTL.templates);
    return data as SharePointTemplate[];
  }

  /** The template with this ID, only if it's for this context. */
  async getForContext(id: number, context: TemplateContext): Promise<SharePointTemplate | undefined> {
    const all = await this.getAll();
    return all.find(t => t.ID === id && t.Context === context);
  }
}

export const templatesRepository = new TemplatesRepository();
