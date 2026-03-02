import express, { Request, Response, Router } from 'express';
import { taxonomyClient } from '../services/taxonomy-client';

const router: Router = express.Router();

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
