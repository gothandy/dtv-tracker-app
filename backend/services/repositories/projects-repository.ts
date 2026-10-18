/**
 * Projects Repository
 */

import { SharePointProject } from '../../../types/project';
import { sharePointClient, CACHE_TTL } from '../sharepoint-client';
import { PROJECT_DESCRIPTION, PROJECT_METADATA, PROJECT_STATUS } from '../field-names';
import { sharePoint } from '../../config';

class ProjectsRepository {
  private get listGuid(): string { return sharePoint.lists.projects; }


  private get selectFields(): string {
    return `ID,Title,Name,${PROJECT_DESCRIPTION},${PROJECT_METADATA},${PROJECT_STATUS},Created,Modified`;
  }

  async create(fields: { Title: string; Name?: string; Description?: string; Status?: string }): Promise<number> {
    const id = await sharePointClient.createListItem(this.listGuid, fields);
    sharePointClient.clearCacheKey('projects');
    return id;
  }

  async updateFields(
    projectId: number,
    fields: Partial<Pick<SharePointProject, 'Title' | 'Name' | 'Description' | 'Status'>>
  ): Promise<void> {
    await sharePointClient.updateListItem(this.listGuid, projectId, fields);
    sharePointClient.clearCacheKey('projects');
  }

  /** The Status column's choices, as set in SharePoint. */
  async statusChoices(): Promise<string[]> {
    return sharePointClient.getColumnChoices(this.listGuid, PROJECT_STATUS);
  }

  async delete(projectId: number): Promise<void> {
    await sharePointClient.deleteListItem(this.listGuid, projectId);
    sharePointClient.clearCacheKey('projects');
  }

  async getAll(): Promise<SharePointProject[]> {
    const cacheKey = 'projects';
    const cached = sharePointClient.cache.get(cacheKey);
    if (cached) {
      console.log(`[Cache] Hit: ${cacheKey}`);
      return cached as SharePointProject[];
    }

    console.log(`[Cache] Miss: ${cacheKey} - fetching from SharePoint`);
    const data = await sharePointClient.getListItems(this.listGuid, this.selectFields);
    sharePointClient.cache.set(cacheKey, data, CACHE_TTL.projects);
    return data as SharePointProject[];
  }
}

export const projectsRepository = new ProjectsRepository();
