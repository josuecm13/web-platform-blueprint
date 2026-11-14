import { entry, id, type Brief, type Draft, type Goal, type Handoff, type Philosophy, type Section, type SectionKind, type Tone, type ActionPolicy } from './model';

const plans: Record<Goal, { order: SectionKind[]; reasons: Partial<Record<SectionKind, string>> }> = {
  signup: {
    order: ['hero', 'benefits', 'faq', 'cta'],
    reasons: {
      hero: 'Put the sign-up action beside the value proposition so ready visitors can act immediately.',
      benefits: 'Give first-time visitors concrete reasons to try the offer.',
      faq: 'Resolve common hesitations before the final invitation.',
      cta: 'Give readers who made it this far a second entry point to the same action.',
    },
  },
  educate: {
    order: ['hero', 'text', 'benefits', 'faq', 'cta'],
    reasons: {
      hero: 'Establish what the subject is and who it is for before asking visitors to act.',
      text: 'Give curious readers a place to understand the idea in more depth.',
      benefits: 'Break the explanation into points readers can compare at a glance.',
      faq: 'Anticipate questions without making the main explanation longer.',
      cta: 'Offer the next step after readers have enough context to decide.',
    },
  },
  onboard: {
    order: ['hero', 'steps', 'cta', 'faq'],
    reasons: {
      hero: 'Orient people who have arrived ready to make progress.',
      steps: 'Show the task in the order it needs to happen.',
      cta: 'Put the next action immediately after the instructions.',
      faq: 'Keep answers close for readers who get stuck.',
    },
  },
};

const toneCopy: Record<Tone, { eyebrow: string; cta: string; faq: string }> = {
  direct: { eyebrow: 'Overview', cta: 'Take the next step', faq: 'Common questions' },
  warm: { eyebrow: 'Welcome', cta: 'Ready when you are', faq: 'A few things you might be wondering' },
  editorial: { eyebrow: 'An introduction', cta: 'Where to go from here', faq: 'A closer look' },
};

export function makeSection(kind: SectionKind, brief: Brief, tone: Tone, showAction = kind === 'cta'): Section {
  const copy = toneCopy[tone];
  const name = brief.name.trim() || 'Your page';
  const base = { id: id(), kind, reason: '', eyebrow: '', body: '', items: [], showAction };
  switch (kind) {
    case 'hero':
      return { ...base, eyebrow: copy.eyebrow, title: name, body: brief.promise };
    case 'benefits':
      return {
        ...base, eyebrow: 'Highlights', title: 'What to expect',
        items: [
          entry('Start here', 'Describe the first useful thing a visitor can do.'),
          entry('Build on it', 'Describe what the visitor can do once they get started.'),
          entry('See the result', 'Describe the outcome a visitor can expect.'),
        ],
      };
    case 'faq':
      return {
        ...base, title: copy.faq,
        items: [
          entry(`Who is ${name} for?`, brief.audience ? `It’s designed for ${brief.audience}.` : 'Describe who will get the most out of this.'),
          entry('What should I do first?', brief.action ? `Choose “${brief.action}” to take the next step.` : 'Explain what a visitor should do first.'),
        ],
      };
    case 'cta':
      return { ...base, title: copy.cta };
    case 'text':
      return { ...base, eyebrow: 'In detail', title: `About ${name}`, body: 'Give readers the context they need to understand the idea and decide what to do next.' };
    case 'steps':
      return {
        ...base, title: 'How to get started',
        items: [
          entry('Prepare', 'List anything a visitor needs before beginning.'),
          entry('Get started', 'Describe the first action in the task.'),
          entry('Check your result', 'Explain how the visitor can tell the task is complete.'),
        ],
      };
  }
}

export function planDraft(brief: Brief, philosophy?: Philosophy, parent?: { source: Draft; handoff: Handoff }): Draft {
  const plan = plans[brief.goal];
  const tone = philosophy?.tone ?? 'direct';
  const policy: ActionPolicy = philosophy?.actionPolicy ?? 'repeat';
  const heroAction = brief.goal === 'signup';
  const order = policy === 'single' && heroAction ? plan.order.filter(kind => kind !== 'cta') : plan.order;
  const sections = order.map(kind => {
    const section = makeSection(kind, brief, tone, (kind === 'hero' && heroAction) || kind === 'cta');
    section.reason = plan.reasons[kind] ?? '';
    if (kind === 'hero' && heroAction && policy === 'single') {
      section.reason = 'Put the sign-up action beside the value proposition. The inherited action rule keeps it to one placement.';
    }
    if (kind === 'hero' && parent?.handoff.relation === 'complement') {
      section.eyebrow = tone === 'warm' ? 'Your next step' : 'Next step';
      section.reason += ` Orient visitors arriving from ${parent.source.brief.name} before introducing this page’s next action.`;
    }
    return section;
  });
  return {
    id: id(),
    brief,
    sections,
    theme: philosophy?.theme ?? 'cobalt',
    tone,
    actionPolicy: policy,
    artwork: parent?.source.artwork === 'none' ? 'none' : 'pattern',
    philosophyId: philosophy?.id ?? null,
    origin: parent ? { draftId: parent.source.id, relation: parent.handoff.relation, context: parent.handoff.context } : null,
  };
}
