export const patterns = {
  nav: { label: 'Navigation', icon: 'layout', description: 'A navigation landmark and links to regions.' },
  split: { label: 'Split section', icon: 'hero', description: 'Two regions that stack at narrow widths.' },
  grid: { label: 'Card grid', icon: 'grid', description: 'Repeated regions in a responsive grid.' },
  stack: { label: 'Text stack', icon: 'text', description: 'A heading and lines for establishing hierarchy.' },
  media: { label: 'Media slot', icon: 'page', description: 'A placeholder with a fixed aspect ratio.' },
  disclosure: { label: 'Disclosure', icon: 'faq', description: 'A native expand-and-collapse interaction.' },
  action: { label: 'Action', icon: 'arrow', description: 'A transition to the next step in a journey.' },
} as const;

export const presets = {
  landing: { label: 'Landing layout', blocks: ['nav', 'split', 'grid', 'disclosure', 'action'] },
  reading: { label: 'Reading layout', blocks: ['nav', 'stack', 'media', 'stack', 'action'] },
  flow: { label: 'Flow step', blocks: ['nav', 'stack', 'disclosure', 'action'] },
  blank: { label: 'Empty canvas', blocks: [] },
} as const;

export const effects = { none: 'None', reveal: 'Rise into view', fade: 'Fade into view', scale: 'Scale into view' } as const;
export const spacings = { tight: 'Compact', regular: 'Regular', airy: 'Spacious' } as const;
export type Pattern = keyof typeof patterns;
export type Effect = keyof typeof effects;
export type Spacing = keyof typeof spacings;
export type Preset = keyof typeof presets;
export type Block = { id: string; kind: Pattern; effect: Effect; spacing: Spacing; columns: 2 | 3 | 4 };
export type Sheet = {
  id: string;
  name: string;
  blocks: Block[];
  philosophy: string;
  origin?: { id: string; relation: 'sibling' | 'next'; handoff: string };
  next?: string;
};
export type Project = { active: string; sheets: Sheet[] };

const key = 'blueprint-layout-studio-v1';
const maximum = 60;
let counter = 0;
export function id() {
  return globalThis.crypto?.randomUUID?.() ?? `layout-${Date.now()}-${++counter}`;
}

export function block(kind: Pattern): Block {
  return { id: id(), kind, effect: 'none', spacing: 'regular', columns: 3 };
}

export function sheet(name: string, preset: Preset): Sheet {
  return { id: id(), name, philosophy: '', blocks: presets[preset].blocks.map(block) };
}

export function loadProject(): Project {
  try {
    const saved: Project = JSON.parse(localStorage.getItem(key) ?? 'null');
    const validId = (value: unknown) => typeof value === 'string' && /^[a-z0-9-]+$/.test(value);
    if (saved?.sheets.length && saved.sheets.length <= maximum && saved.sheets.some(item => item.id === saved.active)
      && saved.sheets.every(item => validId(item.id) && typeof item.name === 'string' && typeof item.philosophy === 'string'
        && item.blocks.length <= maximum && item.blocks.every(b => validId(b.id) && Object.hasOwn(patterns, b.kind)
          && Object.hasOwn(effects, b.effect) && Object.hasOwn(spacings, b.spacing) && [2, 3, 4].includes(b.columns)))) return saved;
  } catch { /* The starter canvas is available without storage. */ }
  const starter = sheet('Landing layout', 'landing');
  starter.philosophy = 'Lead with one clear region. Keep supporting detail collapsible and preserve reading order at narrow widths.';
  starter.blocks[2].effect = 'reveal';
  return { active: starter.id, sheets: [starter] };
}

export function saveProject(project: Project) {
  try {
    localStorage.setItem(key, JSON.stringify(project));
    return true;
  } catch {
    return false;
  }
}

export const limit = maximum;

export function buildPrompt(source: Sheet, target: string, relation: 'sibling' | 'next', handoff: string) {
  const outline = source.blocks.map(item => {
    const columns = item.kind === 'grid' ? `, up to ${item.columns} columns` : '';
    const motion = item.effect === 'none' ? '' : `, ${effects[item.effect].toLowerCase()} on scroll`;
    return `- ${patterns[item.kind].label} (${spacings[item.spacing].toLowerCase()} spacing${columns}${motion})`;
  });
  return [
    `# Layout brief · ${target.trim() || 'Next layout'}`,
    relation === 'next' ? `Design the step after ${source.name}.\n\nArrival and next task: ${handoff.trim() || 'Describe what the visitor has just done and what comes next.'}`
      : `Design a sibling layout that follows the UX philosophy of ${source.name}.${handoff.trim() ? `\n\nContext: ${handoff.trim()}` : ''}`,
    `## UX philosophy\n${source.philosophy.trim() || 'Define the hierarchy, rhythm, and interaction rules to carry forward.'}`,
    `## Source structure\n${outline.join('\n') || '- Empty canvas'}`,
    '## Acceptance criteria\n- Use unlabeled placeholder geometry, or neutral labels for interactive controls.\n- Preserve reading and keyboard order on narrow screens.\n- Keep regions visible with reduced motion and without scroll-driven animations.\n- Make the next interaction clear at each step.',
  ].join('\n\n');
}
