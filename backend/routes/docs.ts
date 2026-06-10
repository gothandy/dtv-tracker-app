import express, { Request, Response, Router } from 'express';
import { getGovernanceDocsTree } from '../services/governance-docs-service';

const router: Router = express.Router();

// Returns the Docs/ folder tree with stable tracker-domain URLs on file nodes (project docs pattern).
router.get('/docs', async (_req: Request, res: Response) => {
  try {
    const data = await getGovernanceDocsTree();
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching governance docs tree:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export = router;
