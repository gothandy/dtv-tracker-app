import express, { Request, Response, Router } from 'express';
/// <reference path="../types/express-session.d.ts" />
import { taxonomyClient } from '../services/taxonomy-client';
import { sessionsRepository } from '../services/repositories/sessions-repository';
import { entriesRepository } from '../services/repositories/entries-repository';
import { groupsRepository } from '../services/repositories/groups-repository';
import { profilesRepository } from '../services/repositories/profiles-repository';
import {
  validateArray,
  validateSession,
  validateEntry,
  validateGroup,
  validateProfile,
  calculateFinancialYear,
  extractMetadataTags,
  safeParseLookupId,
  parseHours,
  nameToSlug,
  profileSlug
} from '../services/data-layer';
import { GROUP_LOOKUP, SESSION_LOOKUP, PROFILE_LOOKUP, SESSION_METADATA, SESSION_STATS } from '../services/field-names';
import type { TagHoursResponse } from '../../types/api-responses';

const router: Router = express.Router();

// Returns hours aggregated by taxonomy tag for the given scope.
// Ancestor labels (e.g. "DH") accumulate hours from all descendant tags.
router.get('/tags/hours-by-taxonomy', async (req: Request, res: Response) => {
  try {
    const fyParam = req.query.fy as string | undefined;    // e.g. "FY2025"
    const groupParam = req.query.group as string | undefined;  // group key (lowercase)
    const profileParam = req.query.profile as string | undefined;  // profile slug

    // Profile-scoped queries reveal individual volunteer activity — require authentication.
    if (profileParam && !req.session.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const termSetId = process.env.TAXONOMY_TERM_SET_ID || null;

    // Profile-scoped queries need entries + profiles to resolve the volunteer's hours per session.
    // All other queries (homepage, group detail) can read hours directly from session.Stats.
    const needsEntries = !!profileParam;

    const [sessionsRaw, entriesRaw, groupsRaw, profilesRaw, taxonomyTree] = await Promise.all([
      sessionsRepository.getAll(),
      needsEntries ? entriesRepository.getAll() : Promise.resolve([]),
      groupsRepository.getAll(),
      needsEntries ? profilesRepository.getAll() : Promise.resolve([]),
      termSetId ? taxonomyClient.getTermSetTree(termSetId).catch(() => null) : Promise.resolve(null),
    ]);

    const sessions = validateArray(sessionsRaw, validateSession, 'Session');
    const groups = validateArray(groupsRaw, validateGroup, 'Group');

    // Filter entries to profile scope (if requested), then derive session ID set
    let profileSessionIds: Set<number> | null = null;
    const profileSessionHours = new Map<number, number>(); // sessionId → hours for this profile

    if (profileParam) {
      const profiles = validateArray(profilesRaw, validateProfile, 'Profile');
      const profile = profiles.find(p => profileSlug(p.Title, p.ID) === profileParam);
      if (profile) {
        const entries = validateArray(entriesRaw, validateEntry, 'Entry');
        const profileEntries = entries.filter(e => safeParseLookupId(e[PROFILE_LOOKUP]) === profile.ID);
        profileSessionIds = new Set<number>();
        for (const e of profileEntries) {
          const sessionId = safeParseLookupId(e[SESSION_LOOKUP]);
          if (sessionId == null) continue;
          profileSessionIds.add(sessionId);
          profileSessionHours.set(sessionId, (profileSessionHours.get(sessionId) ?? 0) + parseHours(e.Hours));
        }
      } else {
        // Unknown profile — return empty
        res.json({ success: true, data: [] });
        return;
      }
    }

    // Filter sessions: FY, group, profile scope
    let filteredSessions = sessions;

    if (fyParam) {
      const fyYear = parseInt(fyParam.replace('FY', ''), 10);
      filteredSessions = filteredSessions.filter(s => {
        const date = new Date(s.Date);
        return !isNaN(date.getTime()) && calculateFinancialYear(date) === fyYear;
      });
    }

    if (groupParam) {
      const group = groups.find(g => (g.Title || '').toLowerCase() === groupParam.toLowerCase());
      if (group) {
        filteredSessions = filteredSessions.filter(s => safeParseLookupId(s[GROUP_LOOKUP]) === group.ID);
      } else {
        res.json({ success: true, data: [] });
        return;
      }
    }

    if (profileSessionIds !== null) {
      filteredSessions = filteredSessions.filter(s => profileSessionIds!.has(s.ID));
    }

    // Build sessionHoursMap: hours to attribute to each session.
    // Profile scope: use the volunteer's own entry hours.
    // All other scopes: read from pre-computed session Stats field (avoids fetching all entries).
    const sessionHoursMap = new Map<number, number>();
    if (profileSessionIds !== null) {
      for (const [sid, hrs] of profileSessionHours) {
        sessionHoursMap.set(sid, hrs);
      }
    } else {
      for (const s of filteredSessions) {
        try {
          const stats = s[SESSION_STATS] ? JSON.parse(s[SESSION_STATS]) : null;
          sessionHoursMap.set(s.ID, stats?.hours ?? 0);
        } catch {
          sessionHoursMap.set(s.ID, 0);
        }
      }
    }

    // Accumulate raw hours per tag label directly applied to each session
    const rawTagHours = new Map<string, number>();
    for (const session of filteredSessions) {
      const tags = extractMetadataTags(session[SESSION_METADATA]);
      if (tags.length === 0) continue;
      const hrs = sessionHoursMap.get(session.ID) ?? 0;
      for (const tag of tags) {
        if (!tag.label) continue;
        rawTagHours.set(tag.label, (rawTagHours.get(tag.label) ?? 0) + hrs);
      }
    }

    // Propagate hours upward through ancestor paths
    // "DH:Corkscrew:Top" → also adds to "DH:Corkscrew" and "DH"
    const aggregatedHours = new Map<string, number>();
    for (const [label, hrs] of rawTagHours) {
      const parts = label.split(':').map(p => p.trim());
      for (let i = 0; i < parts.length; i++) {
        const ancestorLabel = parts.slice(0, i + 1).join(':');
        aggregatedHours.set(ancestorLabel, (aggregatedHours.get(ancestorLabel) ?? 0) + hrs);
      }
    }

    // Build colon-path → termGuid map from the taxonomy tree (if available)
    // Walks nodes recursively, building paths like "DH", "DH:Corkscrew", "DH:Corkscrew:Top"
    function buildTermGuidMap(
      nodes: { label: string; id: string; children?: any[] }[],
      prefix: string
    ): Map<string, string> {
      const map = new Map<string, string>();
      for (const node of nodes) {
        const path = prefix ? `${prefix}:${node.label}` : node.label;
        if (node.id) map.set(path, node.id);
        if (node.children?.length) {
          for (const [p, g] of buildTermGuidMap(node.children, path)) map.set(p, g);
        }
      }
      return map;
    }
    const termGuidMap = taxonomyTree ? buildTermGuidMap(taxonomyTree, '') : new Map<string, string>();

    // Build response
    const result: TagHoursResponse = [];
    for (const [label, hours] of aggregatedHours) {
      const depth = (label.match(/:/g) ?? []).length;
      const termGuid = termGuidMap.get(label);
      result.push({ label, hours: Math.round(hours * 10) / 10, depth, ...(termGuid ? { termGuid } : {}) });
    }

    // Sort: depth ascending, then hours descending within each depth
    result.sort((a, b) => a.depth - b.depth || b.hours - a.hours);

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error fetching tag hours:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/tags/taxonomy', async (req: Request, res: Response) => {
  try {
    const termSetId = process.env.TAXONOMY_TERM_SET_ID || null;
    if (!termSetId) {
      console.log('[Tags] TAXONOMY_TERM_SET_ID is not set');
      res.json({ success: true, data: [] });
      return;
    }

    const tree = await taxonomyClient.getTermSetTree(termSetId);
    res.json({ success: true, data: tree });
  } catch (error: any) {
    console.error('Error fetching tag taxonomy:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export = router;
