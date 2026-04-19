import fs from 'fs/promises';
import path from 'path';
import Handlebars from 'handlebars';

// Named style presets for the section helper — maps style="name" to bg/color/padding
const DEFAULT_PADDING = '24px 32px';
const SECTION_STYLES: Record<string, { bg: string; color: string }> = {
  light: { bg: '#fffffc', color: '#000204' },
  dark:  { bg: '#000204', color: '#fffffc' },
  green: { bg: '#4FAF4A', color: '#fffffc' },
  gold:  { bg: '#B0AB4A', color: '#000204' },
  dirt:  { bg: '#B04A4F', color: '#fffffc' },
  sand:  { bg: '#E1E0D1', color: '#000204' },
};

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

// Compiled template cache — avoids re-reading disk on every send
const templateCache = new Map<string, HandlebarsTemplateDelegate>();

const TEMPLATES_DIR = path.join(__dirname, '..', '..', 'templates', 'email');

async function loadTemplate(name: string): Promise<HandlebarsTemplateDelegate> {
  if (process.env.NODE_ENV !== 'development' && templateCache.has(name)) return templateCache.get(name)!;
  const src = await fs.readFile(path.join(TEMPLATES_DIR, `${name}.hbs`), 'utf-8');
  const compiled = Handlebars.compile(src);
  templateCache.set(name, compiled);
  return compiled;
}

export function clearEmailTemplateCache(): void {
  templateCache.clear();
}

export async function renderEmail(template: string, vars: Record<string, unknown>): Promise<string> {
  const [renderBody, renderBase] = await Promise.all([
    loadTemplate(template),
    loadTemplate('base'),
  ]);
  const body = renderBody(vars);
  const html = renderBase({ ...vars, body });
  // Strip whitespace between tags — prevents Outlook from rendering inter-row gaps
  return html.replace(/>\s+</g, '><');
}
