import fs from 'fs/promises';
import path from 'path';
import Handlebars from 'handlebars';
import { BRAND } from '../frontend/src/styles/brand';

// Named style presets for the section helper — maps style="name" to bg/color/padding
// Colours sourced from frontend/src/styles/brand.ts (canonical) + main.css @theme.
const DEFAULT_PADDING = '24px 32px';
const SECTION_STYLES: Record<string, { bg: string; color: string }> = {
  light: { bg: BRAND.light, color: BRAND.dark  },
  dark:  { bg: BRAND.dark,  color: BRAND.light },
  green: { bg: BRAND.green, color: BRAND.light },
  gold:  { bg: BRAND.gold,  color: BRAND.dark  },
  dirt:  { bg: BRAND.dirt,  color: BRAND.light },
  sand:  { bg: BRAND.sand,  color: BRAND.dark  },
};

// Inline helper: {{{nl2br someVar}}} — escapes text then converts \n to <br>
Handlebars.registerHelper('nl2br', (text: unknown) => {
  if (!text) return '';
  return new Handlebars.SafeString(Handlebars.escapeExpression(String(text)).replace(/\n/g, '<br>'));
});

// Block helper: {{#section style="dark"}}...{{/section}}
// style defaults to "light". padding can be overridden: {{#section style="dark" padding="24px 32px"}}
// Wraps content in the standard MSO-safe centred inner-table row pattern.
Handlebars.registerHelper('section', function(this: unknown, options: Handlebars.HelperOptions) {
  const styleName: string = options.hash.style ?? 'light';
  const preset = SECTION_STYLES[styleName] ?? SECTION_STYLES.light;
  const bg = preset.bg;
  const color = preset.color;
  const padding: string = options.hash.padding ?? DEFAULT_PADDING;
  const content: string = options.fn(this);
  return new Handlebars.SafeString(
    `<tr>` +
    `<td align="center" valign="top" style="padding:0 16px;">` +
    `<!--[if (gte mso 9)|(IE)]><table align="center" border="0" cellspacing="0" cellpadding="0" width="600" style="width:600px;"><tr><td><![endif]-->` +
    `<table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;" bgcolor="${bg}" role="presentation">` +
    `<tr><td bgcolor="${bg}" valign="top" style="background-color:${bg};padding:${padding};font-size:16px;line-height:1.8;color:${color};font-family:Inter,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">` +
    content +
    `</td></tr>` +
    `</table>` +
    `<!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->` +
    `</td></tr>`
  );
});

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

// Compiled template cache — avoids re-reading disk on every send
const templateCache = new Map<string, HandlebarsTemplateDelegate>();

const TEMPLATES_DIR = path.join(__dirname, '..', '..', 'templates', 'email');

async function loadTemplate(filePath: string): Promise<HandlebarsTemplateDelegate> {
  if (process.env.NODE_ENV !== 'development' && templateCache.has(filePath)) return templateCache.get(filePath)!;
  const src = await fs.readFile(filePath, 'utf-8');
  const compiled = Handlebars.compile(src);
  templateCache.set(filePath, compiled);
  return compiled;
}

export function clearEmailTemplateCache(): void {
  templateCache.clear();
}

export async function renderEmail(template: string, vars: Record<string, unknown>): Promise<RenderedEmail> {
  const templateDir = path.join(TEMPLATES_DIR, template);
  const [renderSubject, renderText, renderHtml, renderBase] = await Promise.all([
    loadTemplate(path.join(templateDir, 'subject.hbs')),
    loadTemplate(path.join(templateDir, 'text.hbs')),
    loadTemplate(path.join(templateDir, 'html.hbs')),
    loadTemplate(path.join(TEMPLATES_DIR, 'base.hbs')),
  ]);

  const subject = renderSubject(vars).trim();
  const text = renderText(vars).trim();
  const body = renderHtml(vars);
  const html = renderBase({ ...vars, body }).replace(/>\s+</g, '><');

  return { subject, html, text };
}
