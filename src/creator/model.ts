import type { LiveSpecimenId } from '../specimen-registry';

export const goals = {
  signup: 'Collect sign-ups',
  educate: 'Explain a product or idea',
  onboard: 'Guide someone through a task',
} as const;

export const themes = {
  cobalt: 'Cobalt',
  ink: 'Ink',
  grove: 'Grove',
} as const;

export const tones = {
  direct: 'Direct and clear',
  warm: 'Warm and encouraging',
  editorial: 'Considered and editorial',
} as const;

export const sectionTypes = {
  hero: { label: 'Hero', description: 'Introduce the page and its promise.', icon: 'hero', reference: 'creatorHero' },
  benefits: { label: 'Benefits grid', description: 'Give readers three concrete reasons to care.', icon: 'grid', reference: 'creatorGrid', specimen: 'responsive-card' },
  faq: { label: 'FAQ', description: 'Answer questions with native disclosures.', icon: 'faq', reference: 'disclosure', specimen: 'native-disclosure' },
  cta: { label: 'Call to action', description: 'Give readers a clear next step.', icon: 'arrow', reference: 'creatorAction' },
  text: { label: 'Editorial text', description: 'Explain an idea in a focused reading column.', icon: 'text', reference: 'creatorText' },
  steps: { label: 'Steps', description: 'Guide readers through an ordered sequence.', icon: 'steps', reference: 'creatorSteps' },
} as const;

export const workflowReferences = {
  'responsive-card': 'Responsive card',
  'native-disclosure': 'Native disclosure',
  'native-dialog': 'Native dialog',
  'layer-shift': 'Layer shift',
} as const satisfies Partial<Record<LiveSpecimenId, string>>;

export type Goal = keyof typeof goals;
export type Theme = keyof typeof themes;
export type Tone = keyof typeof tones;
export type SectionKind = keyof typeof sectionTypes;
export type ReferenceId = keyof typeof workflowReferences;
export type Relation = 'sibling' | 'complement';
export type ActionPolicy = 'single' | 'repeat';
export type Artwork = 'forma' | 'pattern' | 'none';

export type Brief = {
  name: string;
  audience: string;
  goal: Goal;
  promise: string;
  action: string;
  href: string;
  targetId?: string;
};

export type Entry = { id: string; title: string; body: string };
export type Section = {
  id: string;
  kind: SectionKind;
  eyebrow: string;
  title: string;
  body: string;
  items: Entry[];
  showAction: boolean;
  reason: string;
};

export type Philosophy = {
  id: string;
  name: string;
  experience: string;
  tone: Tone;
  theme: Theme;
  actionPolicy: ActionPolicy;
  rules: { id: string; text: string; required: boolean }[];
  references: ReferenceId[];
};

export type Handoff = { brief: Brief; relation: Relation; context: string; linkSource?: boolean };
export type Draft = {
  id: string;
  brief: Brief;
  sections: Section[];
  theme: Theme;
  tone: Tone;
  actionPolicy: ActionPolicy;
  artwork: Artwork;
  philosophyId: string | null;
  origin: { draftId: string; relation: Relation; context: string } | null;
};

export const limit = { drafts: 40, sections: 24, items: 24, rules: 16 } as const;
export type Project = {
  version: 1;
  activeId: string;
  drafts: Draft[];
  philosophies: Philosophy[];
  handoffs: { [draftId: string]: Handoff };
};

let nextId = 0;
export function id() {
  return globalThis.crypto?.randomUUID?.() ?? `creator-${Date.now()}-${++nextId}`;
}

export function entry(title = '', body = ''): Entry {
  return { id: id(), title, body };
}

export function emptyBrief(): Brief {
  return { name: '', audience: '', goal: 'signup', promise: '', action: '', href: '' };
}

export function activeDraft(project: Project): Draft {
  return project.drafts.find(draft => draft.id === project.activeId) ?? project.drafts[0];
}

export function philosophyFor(project: Project, draft: Draft) {
  return project.philosophies.find(philosophy => philosophy.id === draft.philosophyId);
}

export function defaultPhilosophy(draft: Draft): Philosophy {
  return {
    id: id(),
    name: `${draft.brief.name} UX`,
    experience: draft.brief.promise,
    tone: draft.tone,
    theme: draft.theme,
    actionPolicy: draft.actionPolicy,
    rules: [
      { id: id(), text: 'Keep copy plain, specific, and easy to scan.', required: true },
      { id: id(), text: 'Use semantic HTML, visible keyboard focus, and layouts that work at narrow widths.', required: true },
      { id: id(), text: 'Reveal supporting detail when it helps the reader make their next decision.', required: false },
    ],
    references: ['responsive-card', 'native-disclosure'],
  };
}

export function defaultHandoff(source: Draft): Handoff {
  return {
    brief: {
      ...emptyBrief(),
      audience: source.brief.audience,
      goal: 'educate',
    },
    relation: 'sibling',
    context: '',
    linkSource: !source.brief.targetId,
  };
}

export function draftLabel(draft: Draft) {
  return draft.brief.name.trim() || 'Untitled page';
}

// Accept local relative paths, same-page fragments and ordinary web/contact links.
export function safeHref(value: string) {
  const href = value.trim();
  if (!href || /[\u0000-\u0020\u007f\\]/u.test(href) || href.startsWith('//')) return '';
  const protocol = href.match(/^([a-z][a-z\d+.-]*):/i)?.[1]?.toLowerCase();
  if (!protocol) return href;
  if (protocol === 'mailto' || protocol === 'tel') return href.length > protocol.length + 1 ? href : '';
  if (protocol !== 'https' && protocol !== 'http') return '';
  try {
    const url = new URL(href);
    return new RegExp(`^${protocol}://`, 'i').test(href) && url.hostname ? href : '';
  } catch {
    return '';
  }
}

export function slug(value: string) {
  return value.normalize('NFKD').toLowerCase().replace(/[^a-z\d]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'blueprint-page';
}
