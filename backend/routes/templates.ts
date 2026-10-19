import express, { Request, Response, Router } from 'express';
import { templatesRepository } from '../services/repositories/templates-repository';
import { renderEmail } from '../services/email-renderer';
import { sampleTemplateVars } from '../services/email-vars';
import { requestOrigin } from '../services/request-origin';
import { requirePermission } from '../middleware/require-permission';
import { isTemplateContext, type SharePointTemplate, type TemplateContext } from '../../types/email-template';
import type { TemplateResponse, TemplateDetailResponse } from '../../types/api-responses';
import type { ApiResponse } from '../../types/sharepoint';

const router: Router = express.Router();

function toResponse(t: SharePointTemplate & { Context: TemplateContext }): TemplateResponse {
  return {
    id: t.ID,
    title: t.Title || `Template ${t.ID}`,
    context: t.Context,
    subject: t.Subject ?? '',
    text: t.Text ?? '',
  };
}

const hasContext = (t: SharePointTemplate): t is SharePointTemplate & { Context: TemplateContext } =>
  isTemplateContext(t.Context);

// GET /api/templates[?context=Session] — email templates, all or one context's, by title.
router.get('/templates', requirePermission('viewTemplates'), async (req: Request, res: Response) => {
  try {
    const context = req.query.context;
    if (context !== undefined && !isTemplateContext(context)) {
      res.status(400).json({ success: false, error: 'context must be Session or Profile' });
      return;
    }

    const data = (await templatesRepository.getAll())
      .filter(hasContext)
      .filter(t => context === undefined || t.Context === context)
      .map(toResponse)
      .sort((a, b) => a.title.localeCompare(b.title));

    res.json({ success: true, data } as ApiResponse<TemplateResponse[]>);
  } catch (error: any) {
    console.error('Error fetching email templates:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch email templates', message: error.message });
  }
});

// GET /api/templates/:id — one template, with a preview from made-up data for its context.
router.get('/templates/:id', requirePermission('viewTemplates'), async (req: Request, res: Response) => {
  try {
    const template = (await templatesRepository.getAll())
      .filter(hasContext)
      .find(t => t.ID === Number(req.params.id));
    if (!template) {
      res.status(404).json({ success: false, error: 'Template not found' });
      return;
    }

    let preview: TemplateDetailResponse['preview'];
    try {
      preview = await renderEmail(template, sampleTemplateVars(template.Context, requestOrigin(req)));
    } catch (error: any) {
      // A mistake in the template's Handlebars: show it, so it can be put right.
      preview = { subject: '', html: '', text: `This template can't be rendered: ${error.message}` };
    }

    const data: TemplateDetailResponse = {
      ...toResponse(template),
      html: template.HTML ?? '',
      preview,
    };
    res.json({ success: true, data } as ApiResponse<TemplateDetailResponse>);
  } catch (error: any) {
    console.error('Error fetching email template:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch email template', message: error.message });
  }
});

/** Name, subject and context from a request, or what's wrong with them. */
function templateFields(body: any): { fields?: { Title: string; Subject: string; Context: TemplateContext }; error?: string } {
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  const subject = typeof body?.subject === 'string' ? body.subject.trim() : '';
  if (!title) return { error: 'Name is required' };
  if (!isTemplateContext(body?.context)) return { error: 'context must be Session or Profile' };
  return { fields: { Title: title, Subject: subject, Context: body.context } };
}

// POST /api/templates — add a template (name, subject, context; HTML and Text in SharePoint).
router.post('/templates', requirePermission('editTemplates'), async (req: Request, res: Response) => {
  try {
    const { fields, error } = templateFields(req.body);
    if (!fields) {
      res.status(400).json({ success: false, error });
      return;
    }
    const id = await templatesRepository.create(fields);
    res.json({ success: true, data: { id } } as ApiResponse<{ id: number }>);
  } catch (error: any) {
    console.error('Error adding email template:', error);
    res.status(500).json({ success: false, error: 'Failed to add email template', message: error.message });
  }
});

// PATCH /api/templates/:id — change a template's name, subject and context.
router.patch('/templates/:id', requirePermission('editTemplates'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!(await templatesRepository.getAll()).some(t => t.ID === id)) {
      res.status(404).json({ success: false, error: 'Template not found' });
      return;
    }
    const { fields, error } = templateFields(req.body);
    if (!fields) {
      res.status(400).json({ success: false, error });
      return;
    }
    await templatesRepository.updateFields(id, fields);
    res.json({ success: true, data: { id } } as ApiResponse<{ id: number }>);
  } catch (error: any) {
    console.error('Error updating email template:', error);
    res.status(500).json({ success: false, error: 'Failed to update email template', message: error.message });
  }
});

// DELETE /api/templates/:id — delete a template.
router.delete('/templates/:id', requirePermission('editTemplates'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!(await templatesRepository.getAll()).some(t => t.ID === id)) {
      res.status(404).json({ success: false, error: 'Template not found' });
      return;
    }
    await templatesRepository.delete(id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting email template:', error);
    res.status(500).json({ success: false, error: 'Failed to delete email template', message: error.message });
  }
});

export = router;
