import { goals, limit, safeHref, sectionTypes, themes, tones, workflowReferences, type Brief, type Draft, type Handoff, type Philosophy, type Project, type Section } from './model';

const storageKey = 'blueprint-creator-v1';
const maxFileSize = 4_000_000;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 3000;
}

function key<T extends object>(value: unknown, options: T): value is keyof T {
  return typeof value === 'string' && Object.hasOwn(options, value);
}

function identifier(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9-]{1,80}$/.test(value) && !Object.hasOwn(Object.prototype, value);
}

function unique<T>(items: T[], getId: (item: T) => string) {
  return new Set(items.map(getId)).size === items.length;
}

function brief(value: unknown): value is Brief {
  return record(value) && key(value.goal, goals)
    && [value.name, value.audience, value.promise, value.action, value.href].every(text)
    && (value.targetId === undefined || identifier(value.targetId));
}

function section(value: unknown): value is Section {
  return record(value) && identifier(value.id) && key(value.kind, sectionTypes)
    && [value.eyebrow, value.title, value.body, value.reason].every(text) && typeof value.showAction === 'boolean'
    && Array.isArray(value.items) && value.items.length <= limit.items
    && value.items.every(item => record(item) && identifier(item.id) && text(item.title) && text(item.body))
    && unique(value.items, item => item.id);
}

function relation(value: unknown) {
  return value === 'sibling' || value === 'complement';
}

function draft(value: unknown): value is Draft {
  return record(value) && identifier(value.id) && brief(value.brief) && key(value.theme, themes) && key(value.tone, tones)
    && (value.actionPolicy === 'single' || value.actionPolicy === 'repeat')
    && (value.artwork === 'forma' || value.artwork === 'pattern' || value.artwork === 'none')
    && (value.philosophyId === null || identifier(value.philosophyId))
    && (value.origin === null || (record(value.origin) && identifier(value.origin.draftId) && relation(value.origin.relation) && text(value.origin.context)))
    && Array.isArray(value.sections) && value.sections.length <= limit.sections
    && value.sections.every(section) && unique(value.sections, item => item.id);
}

function philosophy(value: unknown): value is Philosophy {
  return record(value) && identifier(value.id) && text(value.name) && text(value.experience)
    && key(value.theme, themes) && key(value.tone, tones) && (value.actionPolicy === 'single' || value.actionPolicy === 'repeat')
    && Array.isArray(value.rules) && value.rules.length <= limit.rules
    && value.rules.every(rule => record(rule) && identifier(rule.id) && text(rule.text) && typeof rule.required === 'boolean')
    && unique(value.rules, rule => rule.id)
    && Array.isArray(value.references) && value.references.length <= Object.keys(workflowReferences).length
    && value.references.every(ref => key(ref, workflowReferences));
}

function handoff(value: unknown): value is Handoff {
  return record(value) && brief(value.brief) && relation(value.relation) && text(value.context)
    && (value.linkSource === undefined || typeof value.linkSource === 'boolean');
}

export function parseProject(raw: string): Project {
  if (raw.length > maxFileSize) throw new Error('This project exceeds the 4 MB limit.');
  const value: unknown = JSON.parse(raw);
  if (!record(value) || value.version !== 1 || !identifier(value.activeId)
    || !Array.isArray(value.drafts) || !value.drafts.length || value.drafts.length > limit.drafts
    || !value.drafts.every(draft) || !unique(value.drafts, item => item.id)
    || !Array.isArray(value.philosophies) || value.philosophies.length > limit.drafts
    || !value.philosophies.every(philosophy) || !unique(value.philosophies, item => item.id)
    || !record(value.handoffs)) {
    throw new Error('Choose a Blueprint Studio project backup.');
  }

  const draftIds = new Set(value.drafts.map(item => item.id));
  const philosophyIds = new Set(value.philosophies.map(item => item.id));
  if (!draftIds.has(value.activeId)
    || !Object.entries(value.handoffs).every(([pageId, item]) => draftIds.has(pageId) && handoff(item)
      && (!item.brief.targetId || draftIds.has(item.brief.targetId)))
    || value.drafts.some(item => (
      (item.brief.targetId && (item.brief.targetId === item.id || !draftIds.has(item.brief.targetId)))
      || (item.philosophyId !== null && !philosophyIds.has(item.philosophyId))
      || (item.origin && (item.origin.draftId === item.id || !draftIds.has(item.origin.draftId)))
    ))) {
    throw new Error('This project backup refers to missing pages or philosophies.');
  }

  return {
    version: 1,
    activeId: value.activeId,
    drafts: value.drafts,
    philosophies: value.philosophies,
    handoffs: value.handoffs as Project['handoffs'],
  };
}

export async function readBackup(file: File) {
  if (file.size > maxFileSize) throw new Error('This project exceeds the 4 MB limit.');
  return parseProject(await file.text());
}

export function createProjectStorage() {
  let lastSaved: string | null | undefined;
  const storageUnavailable = 'Browser storage is unavailable. Download a project backup to keep this work.';
  const changedElsewhere = 'This project changed in another tab. Download a backup of these edits before reloading.';
  return {
    read(): { project?: Project; message?: string } {
      try {
        lastSaved = localStorage.getItem(storageKey);
      } catch {
        return { message: storageUnavailable };
      }
      if (!lastSaved) return {};
      try {
        return { project: parseProject(lastSaved) };
      } catch {
        lastSaved = undefined;
        return { message: 'The saved project could not be read. Restore a backup to resume saving.' };
      }
    },
    write(project: Project, replace = false): string {
      try {
        const current = localStorage.getItem(storageKey);
        if (!replace && lastSaved === undefined) return 'Autosave is paused. Download a backup to keep this work.';
        if (!replace && current !== lastSaved) return changedElsewhere;
        const raw = JSON.stringify(project);
        if (raw.length > maxFileSize) return 'The project exceeds 4 MB. Remove items to resume saving.';
        localStorage.setItem(storageKey, raw);
        lastSaved = raw;
        return '';
      } catch {
        return storageUnavailable;
      }
    },
    listen(notify: (message: string) => void) {
      window.addEventListener('storage', event => {
        if ((event.key === storageKey || event.key === null) && event.newValue !== lastSaved) notify(changedElsewhere);
      });
    },
  };
}

export function isUsableDestination(value: string) {
  return Boolean(safeHref(value)) || !value.trim();
}
