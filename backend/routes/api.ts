/**
 * API Router — mounts all route modules
 */

import express, { Router } from 'express';
import { requireAdmin } from '../middleware/require-admin';
import groupsRoutes = require('./groups');
import sessionsRoutes = require('./sessions');
import entriesRoutes = require('./entries');
import profilesRoutes = require('./profiles');
import regularsRoutes = require('./regulars');
import statsRoutes = require('./stats');
import eventbriteRoutes = require('./eventbrite');
import mediaRoutes = require('./media');
import tagsRoutes = require('./tags');
import backupRoutes = require('./backup');
import emailRoutes = require('./email');

const router: Router = express.Router();

router.use(requireAdmin);
router.use(groupsRoutes);
router.use(sessionsRoutes);
router.use(entriesRoutes);
router.use(profilesRoutes);
router.use(regularsRoutes);
router.use(statsRoutes);
router.use(eventbriteRoutes);
router.use(mediaRoutes);
router.use(tagsRoutes);
router.use(backupRoutes);
router.use('/email', emailRoutes);

export = router;
