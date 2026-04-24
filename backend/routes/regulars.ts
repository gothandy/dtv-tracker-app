import express, { Request, Response, Router } from 'express';
import { groupsRepository } from '../services/repositories/groups-repository';
import { profilesRepository } from '../services/repositories/profiles-repository';
import { regularsRepository } from '../services/repositories/regulars-repository';
import {
  validateArray,
  validateGroup,
  validateProfile,
  safeParseLookupId,
  profileIdFromSlug
} from '../services/data-layer';
import { GROUP_LOOKUP, PROFILE_LOOKUP } from '../services/field-names';
import type { ApiResponse } from '../../types/sharepoint';

const router: Router = express.Router();

router.post('/profiles/:slug/regulars', async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug).toLowerCase();
    const { groupId } = req.body;

    if (!groupId || typeof groupId !== 'number') {
      res.status(400).json({ success: false, error: 'groupId is required and must be a number' });
      return;
    }

    const [rawProfiles, rawGroups, rawRegulars] = await Promise.all([
      profilesRepository.getAll(),
      groupsRepository.getAll(),
      regularsRepository.getAll()
    ]);

    const profiles = validateArray(rawProfiles, validateProfile, 'Profile');
    const profileId = profileIdFromSlug(slug);
    const spProfile = profileId !== undefined
      ? profiles.find(p => p.ID === profileId)
      : undefined;
    if (!spProfile) {
      res.status(404).json({ success: false, error: 'Profile not found' });
      return;
    }

    const groups = validateArray(rawGroups, validateGroup, 'Group');
    const group = groups.find(g => g.ID === groupId);
    if (!group) {
      res.status(404).json({ success: false, error: 'Group not found' });
      return;
    }

    // Check for existing regular to prevent duplicates
    const existing = rawRegulars.find(
      r => safeParseLookupId(r[PROFILE_LOOKUP]) === spProfile.ID
        && safeParseLookupId(r[GROUP_LOOKUP]) === groupId
    );
    if (existing) {
      res.json({ success: true, data: { id: existing.ID } } as ApiResponse<{ id: number }>);
      return;
    }

    const { accompanyingAdultId } = req.body;
    const createFields: Record<string, any> = {
      [PROFILE_LOOKUP]: String(spProfile.ID),
      [GROUP_LOOKUP]: String(group.ID),
      Title: spProfile.Title || ''
    };
    if (accompanyingAdultId !== undefined && accompanyingAdultId !== null) {
      if (typeof accompanyingAdultId !== 'number' || !Number.isInteger(accompanyingAdultId) || accompanyingAdultId < 1) {
        res.status(400).json({ success: false, error: 'accompanyingAdultId must be a positive integer' });
        return;
      }
      createFields.AccompanyingAdultLookupId = accompanyingAdultId;
    }
    const id = await regularsRepository.create(createFields);

    res.json({ success: true, data: { id } } as ApiResponse<{ id: number }>);
  } catch (error: any) {
    console.error('Error creating regular:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create regular',
      message: error.message
    });
  }
});

router.patch('/regulars/:id', async (req: Request, res: Response) => {
  try {
    const regularId = parseInt(String(req.params.id), 10);
    if (isNaN(regularId)) {
      res.status(400).json({ success: false, error: 'Invalid regular ID' });
      return;
    }

    const { accompanyingAdultId } = req.body;
    const fields: Record<string, any> = {};

    if (accompanyingAdultId !== undefined) {
      if (accompanyingAdultId === null) {
        fields.AccompanyingAdultLookupId = null;
      } else {
        if (typeof accompanyingAdultId !== 'number' || !Number.isInteger(accompanyingAdultId) || accompanyingAdultId < 1) {
          res.status(400).json({ success: false, error: 'accompanyingAdultId must be a positive integer or null' });
          return;
        }
        fields.AccompanyingAdultLookupId = accompanyingAdultId;
      }
    }

    if (Object.keys(fields).length > 0) {
      await regularsRepository.update(regularId, fields);
    }
    res.json({ success: true } as ApiResponse<void>);
  } catch (error: any) {
    console.error('Error updating regular:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update regular',
      message: error.message
    });
  }
});

router.delete('/regulars/:id', async (req: Request, res: Response) => {
  try {
    const regularId = parseInt(String(req.params.id), 10);
    if (isNaN(regularId)) {
      res.status(400).json({ success: false, error: 'Invalid regular ID' });
      return;
    }

    await regularsRepository.delete(regularId);
    res.json({ success: true } as ApiResponse<void>);
  } catch (error: any) {
    console.error('Error deleting regular:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete regular',
      message: error.message
    });
  }
});

export = router;
