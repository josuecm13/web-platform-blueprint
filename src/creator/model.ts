export const patterns = {
  group: { label: 'Layout group', icon: 'layout', description: 'Gather elements into a stack or a responsive row.' },
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
export const ranges = { entry: 'As it enters', late: 'Late entrance', across: 'While it crosses the canvas' } as const;
export const intensities = { soft: 'Subtle', regular: 'Regular', strong: 'Strong' } as const;
export const arrangements = { stack: 'Stack', row: 'Responsive row' } as const;
export const spacings = { tight: 'Compact', regular: 'Regular', airy: 'Spacious' } as const;
export type Pattern = keyof typeof patterns;
export type Effect = keyof typeof effects;
export type Spacing = keyof typeof spacings;
export type Preset = keyof typeof presets;
export type Block = {
  id: string; kind: Pattern; effect: Effect; spacing: Spacing; columns: 2 | 3 | 4;
  children?: Block[];
  arrangement?: keyof typeof arrangements;
  range?: keyof typeof ranges;
  intensity?: keyof typeof intensities;
};
export type Placement = { target?: string; position: 'before' | 'after' | 'inside' };

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
  return { id: id(), kind, effect: 'none', spacing: 'regular', columns: 3, ...(kind === 'group' ? { children: [] } : {}) };
}

export function allBlocks(blocks: Block[]): Block[] {
  return blocks.flatMap(item => [item, ...allBlocks(item.children ?? [])]);
}

export function locate(blocks: Block[], target?: string, parent?: Block): { items: Block[]; index: number; parent?: Block } | undefined {
  for (const [index, item] of blocks.entries()) {
    if (item.id === target) return { items: blocks, index, parent };
    const found = item.children && locate(item.children, target, item);
    if (found) return found;
  }
}

export function insertion(blocks: Block[], placement: Placement) {
  if (!placement.target) return { items: blocks, index: blocks.length };
  const found = locate(blocks, placement.target);
  if (!found) return;
  if (placement.position === 'inside') {
    const items = found.items[found.index].children;
    if (items) return { items, index: items.length };
    return;
  }
  return { items: found.items, index: found.index + Number(placement.position === 'after') };
}

export function copyBlock(item: Block): Block {
  return { ...item, id: id(), ...(item.children ? { children: item.children.map(copyBlock) } : {}) };
}

function validBlocks(input: Block[], validId: (value: unknown) => boolean, seen = new Set<string>()): boolean {
  return Array.isArray(input) && input.every(item => {
    if (!item || !validId(item.id) || seen.has(item.id) || seen.size >= maximum
      || !Object.hasOwn(patterns, item.kind) || !Object.hasOwn(effects, item.effect)
      || !Object.hasOwn(spacings, item.spacing) || ![2, 3, 4].includes(item.columns)
      || (item.arrangement !== undefined && !Object.hasOwn(arrangements, item.arrangement))
      || (item.range !== undefined && !Object.hasOwn(ranges, item.range))
      || (item.intensity !== undefined && !Object.hasOwn(intensities, item.intensity))) return false;
    seen.add(item.id);
    return item.kind === 'group' ? validBlocks(item.children!, validId, seen) : item.children === undefined;
  });
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
        && validBlocks(item.blocks, validId))) return saved;
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
  function describe(blocks: Block[], indent = ''): string[] {
    return blocks.flatMap(item => {
      const arrangement = item.kind === 'grid' ? `, up to ${item.columns} columns`
        : item.kind === 'group' ? `, ${arrangements[item.arrangement ?? 'stack'].toLowerCase()}` : '';
      const motion = item.effect === 'none' ? '' :
        `, ${intensities[item.intensity ?? 'regular'].toLowerCase()} ${effects[item.effect].toLowerCase()}, ${ranges[item.range ?? 'entry'].toLowerCase()}`;
      return [`${indent}- ${patterns[item.kind].label} (${spacings[item.spacing].toLowerCase()} spacing${arrangement}${motion})`,
        ...describe(item.children ?? [], indent + '  ')];
    });
  }
  const outline = describe(source.blocks);
  return [
    `# Layout brief · ${target.trim() || 'Next layout'}`,
    relation === 'next' ? `Design the step after ${source.name}.\n\nArrival and next task: ${handoff.trim() || 'Describe what the visitor has just done and what comes next.'}`
      : `Design a sibling layout that follows the UX philosophy of ${source.name}.${handoff.trim() ? `\n\nContext: ${handoff.trim()}` : ''}`,
    `## UX philosophy\n${source.philosophy.trim() || 'Define the hierarchy, rhythm, and interaction rules to carry forward.'}`,
    `## Source structure\n${outline.join('\n') || '- Empty canvas'}`,
    '## Acceptance criteria\n- Use unlabeled placeholder geometry, or neutral labels for interactive controls.\n- Preserve reading and keyboard order on narrow screens.\n- Keep regions visible with reduced motion and without scroll-driven animations.\n- Make the next interaction clear at each step.',
  ].join('\n\n');
}
