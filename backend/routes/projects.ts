import express, { Request, Response, Router } from 'express';
/// <reference path="../types/express-session.d.ts" />
import { projectsRepository } from '../services/repositories/projects-repository';
import { sessionsRepository } from '../services/repositories/sessions-repository';
import { groupsRepository } from '../services/repositories/groups-repository';
import { regularsRepository } from '../services/repositories/regulars-repository';
import {
  validateArray,
  validateProject,
  convertProject,
  convertSession,
  deriveLimits,
  calculateCurrentFY,
  calculateFinancialYear,
  findProjectByKey,
  safeParseLookupId,
  extractMetadataTags,
  parseSessionStats,
} from '../services/data-layer';
import {
  GROUP_LOOKUP,
  PROJECT_LOOKUP,
  SESSION_NOTES,
  SESSION_METADATA,
  SESSION_COVER_MEDIA,
  SESSION_STATS,
  PROJECT_METADATA,
} from '../services/field-names';
import type {
  ProjectResponse,
  ProjectDetailResponse,
  ProjectAttachmentResponse,
  SessionResponse,
} from '../../types/api-responses';
import type { ApiResponse } from '../../types/sharepoint';
import { sharePointClient } from '../services/sharepoint-client';
import { aggregateSessionStatsForScope } from '../services/session-entity-stats';
import { normalizeMetadataTagsInput, updateListItemMetadata } from '../services/metadata-tags';
import type { SharePointSession } from '../../types/session';

const router: Router = express.Router();

function mapSessionsToResponses(
  projectSessions: SharePointSession[],
  projectKey: string,
  groupsRaw: Awaited<ReturnType<typeof groupsRepository.getAll>>,
  regularsRaw: Awaited<ReturnType<typeof regularsRepository.getAll>>
): SessionResponse[] {
  const groupKeyMap = new Map(groupsRaw.map(g => [g.ID, (g.Title || '').toLowerCase()]));
  const groupNameMap = new Map(groupsRaw.map(g => [g.ID, g.Name || g.Title || '']));
  const groupRegularsCountMap = new Map<number, number>();
  for (const r of regularsRaw) {
    const gid = safeParseLookupId(r[GROUP_LOOKUP]);
    if (gid !== undefined) groupRegularsCountMap.set(gid, (groupRegularsCountMap.get(gid) ?? 0) + 1);
  }
  const today = new Date().toISOString().slice(0, 10);

  return projectSessions
    .map(s => {
      const groupId = safeParseLookupId(s[GROUP_LOOKUP]);
      const date = s.Date!;
      const stats = parseSessionStats(s[SESSION_STATS]);
      const gKey = groupId !== undefined ? groupKeyMap.get(groupId) : undefined;
      return {
        id: s.ID,
        displayName: s.Name || undefined,
        description: s[SESSION_NOTES],
        date,
        groupId,
        groupKey: gKey,
        groupName: groupId !== undefined ? groupNameMap.get(groupId) : undefined,
        limits: deriveLimits(
          convertSession(s).limits,
          groupId !== undefined ? groupRegularsCountMap.get(groupId) : undefined,
          stats.cancelledRegular ?? 0
        ),
        stats,
        regularsCount: groupId !== undefined ? groupRegularsCountMap.get(groupId) : undefined,
        mediaCount: stats.media,
        coverUrl:
          s[SESSION_COVER_MEDIA] && gKey
            ? `/media/${gKey}/${date}/${s[SESSION_COVER_MEDIA]}`
            : undefined,
        financialYear: `FY${calculateFinancialYear(new Date(date))}`,
        isBookable: date >= today,
        eventbriteEventId: s.EventbriteEventID,
        metadata: (() => {
          const tags = extractMetadataTags(s[SESSION_METADATA]);
          return tags.length ? tags : undefined;
        })(),
        projectId: safeParseLookupId(s[PROJECT_LOOKUP]),
        projectKey,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

router.get('/projects', async (_req: Request, res: Response) => {
  try {
    const raw = await projectsRepository.getAll();
    const projects = validateArray(raw, validateProject, 'Project');

    const data: ProjectResponse[] = projects.map(sp => {
      const p = convertProject(sp);
      const metadata = extractMetadataTags(sp[PROJECT_METADATA]);
      return {
        id: p.sharePointId,
        key: (p.lookupKeyName || '').toLowerCase(),
        displayName: p.displayName,
        description: p.description,
        metadata: metadata.length ? metadata : undefined,
      };
    });

    res.json({ success: true, count: data.length, data } as ApiResponse<ProjectResponse[]>);
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects from SharePoint',
      message: error.message,
    });
  }
});

router.get('/projects/:key', async (req: Request, res: Response) => {
  try {
    const key = String(req.params.key).toLowerCase();
    const fy = calculateCurrentFY();

    const [rawProjects, rawSessions, rawGroups, rawRegulars] = await Promise.all([
      projectsRepository.getAll(),
      sessionsRepository.getAll(),
      groupsRepository.getAll(),
      regularsRepository.getAll(),
    ]);

    const spProject = findProjectByKey(rawProjects, key);
    if (!spProject) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    const project = convertProject(spProject);
    const projectId = spProject.ID;
    const metadata = extractMetadataTags(spProject[PROJECT_METADATA]);

    const projectSessions = rawSessions.filter(
      s => s.Date && safeParseLookupId(s[PROJECT_LOOKUP]) === projectId
    );

    const stats = aggregateSessionStatsForScope(projectSessions, { projectId }, { fyScope: 'current' });
    const sessions = mapSessionsToResponses(projectSessions, key, rawGroups, rawRegulars);

    const data: ProjectDetailResponse = {
      id: project.sharePointId,
      key: (project.lookupKeyName || '').toLowerCase(),
      displayName: project.displayName,
      description: project.description,
      metadata: metadata.length ? metadata : undefined,
      financialYear: `${fy.startYear}-${fy.endYear}`,
      stats,
      sessions,
    };

    res.json({ success: true, data } as ApiResponse<ProjectDetailResponse>);
  } catch (error: any) {
    console.error('Error fetching project detail:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project detail',
      message: error.message,
    });
  }
});

router.get('/projects/:key/attachments', async (req: Request, res: Response) => {
  try {
    const key = String(req.params.key).toLowerCase();
    const rawProjects = await projectsRepository.getAll();
    const spProject = findProjectByKey(rawProjects, key);
    if (!spProject) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    const attachments = await sharePointClient.listListItemAttachments(process.env.PROJECTS_LIST_GUID!, spProject.ID);
    res.json({ success: true, data: attachments } as ApiResponse<ProjectAttachmentResponse[]>);
  } catch (error: any) {
    console.error('Error fetching project attachments:', error);
    // Do not fail the project page — documents are optional
    res.json({ success: true, data: [] } as ApiResponse<ProjectAttachmentResponse[]>);
  }
});

router.post('/projects', async (req: Request, res: Response) => {
  try {
    const { key, name, description } = req.body;

    if (!key || typeof key !== 'string' || !key.trim()) {
      res.status(400).json({ success: false, error: 'Key is required' });
      return;
    }

    const keyNorm = key.trim().toLowerCase();
    const nameNorm = typeof name === 'string' ? name.trim().toLowerCase() : '';

    const existing = await projectsRepository.getAll();
    const keyClash = existing.find(p => (p.Title || '').toLowerCase() === keyNorm);
    if (keyClash) {
      res.status(409).json({ success: false, error: `A project with key "${key.trim()}" already exists` });
      return;
    }
    if (nameNorm) {
      const nameClash = existing.find(p => (p.Name || '').toLowerCase() === nameNorm);
      if (nameClash) {
        res.status(409).json({
          success: false,
          error: `A project with display name "${name.trim()}" already exists`,
        });
        return;
      }
    }

    const fields: { Title: string; Name?: string; Description?: string } = { Title: key.trim() };
    if (typeof name === 'string' && name.trim()) fields.Name = name.trim();
    if (typeof description === 'string' && description.trim()) fields.Description = description.trim();

    const id = await projectsRepository.create(fields);
    res.json({
      success: true,
      data: { id, key: fields.Title.toLowerCase(), displayName: fields.Name || fields.Title },
    });
  } catch (error: any) {
    console.error('Error creating project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create project',
      message: error.message,
    });
  }
});

router.patch('/projects/:key', async (req: Request, res: Response) => {
  try {
    const key = String(req.params.key).toLowerCase();
    const { displayName, description, key: newKeyRaw, metadata } = req.body;

    const fields: Record<string, unknown> = {};
    if (typeof displayName === 'string') fields.Name = displayName;
    if (typeof description === 'string') fields.Description = description;
    if (typeof newKeyRaw === 'string' && newKeyRaw.trim()) {
      if (/\s/.test(newKeyRaw.trim())) {
        res.status(400).json({ success: false, error: 'Key cannot contain spaces' });
        return;
      }
      fields.Title = newKeyRaw.trim();
    }

    const metadataTags = normalizeMetadataTagsInput(metadata);

    if (Object.keys(fields).length === 0 && metadataTags === null) {
      res.status(400).json({ success: false, error: 'No valid fields to update' });
      return;
    }

    const rawProjects = await projectsRepository.getAll();
    const spProject = findProjectByKey(rawProjects, key);
    if (!spProject) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    if (Object.keys(fields).length > 0) {
      await projectsRepository.updateFields(spProject.ID, fields as Record<string, string>);
    }
    if (metadataTags !== null) {
      await updateListItemMetadata(process.env.PROJECTS_LIST_GUID!, spProject.ID, PROJECT_METADATA, metadataTags);
    }

    const resultKey = fields.Title ? String(fields.Title).toLowerCase() : key;
    res.json({ success: true, data: { key: resultKey } } as ApiResponse<{ key: string }>);
  } catch (error: any) {
    console.error('Error updating project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update project',
      message: error.message,
    });
  }
});

router.delete('/projects/:key', async (req: Request, res: Response) => {
  try {
    const key = String(req.params.key).toLowerCase();
    const rawProjects = await projectsRepository.getAll();
    const spProject = findProjectByKey(rawProjects, key);
    if (!spProject) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    await projectsRepository.delete(spProject.ID);
    res.json({ success: true } as ApiResponse<void>);
  } catch (error: any) {
    console.error('Error deleting project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete project',
      message: error.message,
    });
  }
});

export = router;
