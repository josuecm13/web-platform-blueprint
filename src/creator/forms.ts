import { goals, type Brief, type Draft, type Goal } from './model';
import { escapeHtml as html } from './render-page';

export function field(label: string, name: string, value: string, options: { rows?: number; max?: number; required?: boolean; placeholder?: string; help?: string } = {}) {
  const attrs = `name="${name}" maxlength="${options.max ?? 160}"${options.required ? ' required' : ''}${options.placeholder ? ` placeholder="${html(options.placeholder)}"` : ''}`;
  const input = options.rows
    ? `<textarea ${attrs} rows="${options.rows}">${value.startsWith('\n') ? '\n' : ''}${html(value)}</textarea>`
    : `<input type="text" ${attrs} value="${html(value)}">`;
  return `<label class="studio-field"><span>${label}</span>${input}${options.help ? `<small>${options.help}</small>` : ''}</label>`;
}

export function selectField<T extends string>(label: string, name: string, value: T, options: Record<T, string>) {
  const choices = (Object.entries(options) as [T, string][]).map(([key, title]) =>
    `<option value="${html(key)}"${key === value ? ' selected' : ''}>${html(title)}</option>`);
  return `<label class="studio-field"><span>${label}</span><select name="${name}">${choices.join('')}</select></label>`;
}

export function briefFields(brief: Brief, placeholders: boolean, others: Draft[] = []) {
  return [
    field('Page name', 'name', brief.name, { max: 100, required: true, placeholder: placeholders ? 'e.g. Field Notes' : undefined }),
    selectField('Page goal', 'goal', brief.goal, goals),
    field('Audience', 'audience', brief.audience, { max: 180, placeholder: placeholders ? 'e.g. Independent designers' : undefined }),
    field('Page promise', 'promise', brief.promise, { max: 1400, rows: 2, placeholder: placeholders ? 'What will this page help people do?' : undefined }),
    field('Primary action', 'action', brief.action, { max: 100, placeholder: placeholders ? 'e.g. Get started' : undefined }),
    actionDestination(brief, others, placeholders),
  ].join('');
}

export function actionDestination(brief: Brief, others: Draft[], placeholders = true) {
  const value = brief.targetId ?? '';
  const targets = others.length
    ? selectField('Link the action to', 'targetId', value, {
      '': 'A URL or section',
      ...Object.fromEntries(others.map(page => [page.id, page.brief.name.trim() || 'Untitled page'])),
    })
    : '';
  return `${targets}<div data-custom-link${value ? ' hidden' : ''}>${field('Action destination', 'href', brief.href, {
    max: 1000,
    placeholder: placeholders ? 'e.g. #steps or https://example.com' : undefined,
  })}</div>`;
}

export function readBrief(form: FormData): Brief {
  return {
    name: String(form.get('name') ?? ''),
    goal: String(form.get('goal')) as Goal,
    audience: String(form.get('audience') ?? ''),
    promise: String(form.get('promise') ?? ''),
    action: String(form.get('action') ?? ''),
    href: String(form.get('href') ?? ''),
    targetId: String(form.get('targetId') || '') || undefined,
  };
}
