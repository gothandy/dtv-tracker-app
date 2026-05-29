/**
 * Projects Repository
 */

import { SharePointProject } from '../../../types/project';
import { sharePointClient, CACHE_TTL } from '../sharepoint-client';
import { PROJECT_DESCRIPTION, PROJECT_METADATA } from '../field-names';

class ProjectsRepository {
  private listGuid: string;

  constructor() {
    this.listGuid = process.env.PROJECTS_LIST_GUID!;
  }

  private get selectFields(): string {
    return `ID,Title,Name,${PROJECT_DESCRIPTION},${PROJECT_METADATA},Created,Modified`;
  }

  async create(fields: { Title: string; Name?: string; Description?: string }): Promise<number> {
    const id = await sharePointClient.createListItem(this.listGuid, fields);
    sharePointClient.clearCacheKey('projects');
    return id;
  }

  async updateFields(
    projectId: number,
    fields: Partial<Pick<SharePointProject, 'Title' | 'Name' | 'Description'>>
  ): Promise<void> {
    await sharePointClient.updateListItem(this.listGuid, projectId, fields);
    sharePointClient.clearCacheKey('projects');
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
