import { TEMPLATE_VARIABLES, type TemplateContext } from '../../../types/email-template'

/** The Handlebars a template can use (backend/services/email-renderer.ts), with examples using `v`. */
function handlebars(v: string): Array<[string, string]> {
  return [
    [`{{${v}}}`, 'A value (HTML characters are made safe)'],
    [`{{{${v}}}}`, 'A value exactly as it is (the Subject always works this way)'],
    [`{{#if ${v}}}...{{else}}...{{/if}}`, 'Show something only when a value is set or true; the {{else}} part is optional'],
    [`{{#unless ${v}}}...{{/unless}}`, 'Show something only when a value is empty or false'],
    [`{{{nl2br ${v}}}}`, 'Text with its line breaks kept (HTML only)'],
    ['{{#section style="dark"}}...{{/section}}', 'A block of the email (HTML only); styles: light (default), dark, green, gold, dirt, sand'],
  ]
}

/**
 * The template page's Help: the variables a template of this context can use and the Handlebars
 * it supports, as plain text to copy from.
 */
export function templateHelpText(context: TemplateContext): string {
  const width = (rows: Array<[string, string]>) => Math.max(...rows.map(([a]) => a.length)) + 2
  const table = (rows: Array<[string, string]>) => {
    const w = width(rows)
    return rows.map(([a, b]) => a.padEnd(w) + b).join('\n')
  }
  const vars = TEMPLATE_VARIABLES[context]
  const variables: Array<[string, string]> = vars.map(v => [`{{${v.name}}}`, v.description])
  return [
    `Variables for ${context} templates`,
    '',
    table(variables),
    '',
    '',
    'Handlebars',
    '',
    table(handlebars(vars[0].name)),
  ].join('\n')
}
