import { draftLabel, safeHref, slug, type Draft, type Project } from './model';

export function pageFiles(project: Project) {
  const used = new Set(['start-here']);
  return new Map(project.drafts.map(page => {
    const base = slug(draftLabel(page));
    let name = base;
    let suffix = 2;
    while (used.has(name)) name = `${base}-${suffix++}`;
    used.add(name);
    return [page.id, `${name}.html`];
  }));
}

export function pageLink(draft: Draft, files: ReadonlyMap<string, string>) {
  return draft.brief.targetId ? files.get(draft.brief.targetId) ?? '' : safeHref(draft.brief.href);
}
