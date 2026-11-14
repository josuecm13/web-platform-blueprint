import { defaultPhilosophy, entry, type Project, type Brief, type Handoff } from './model';
import { planDraft } from './planner';

export function exampleProject(): Project {
  const brief: Brief = {
    name: 'Forma',
    audience: 'Independent designers and small product teams',
    goal: 'signup',
    promise: 'A modular design toolkit for teams who care how the details fit together.',
    action: 'Explore the toolkit',
    href: '#toolkit',
  };
  const draft = planDraft(brief);
  draft.artwork = 'forma';
  const [hero, benefits, faq, action] = draft.sections;
  Object.assign(hero, { eyebrow: 'THE DESIGN TOOLKIT', title: 'Make space for better design.' });
  Object.assign(benefits, {
    eyebrow: 'INSIDE THE TOOLKIT',
    title: 'The pieces you keep reaching for.',
    body: 'A few thoughtful defaults give good ideas more room.',
    items: [
      entry('Layout primitives', 'Start with a small set of responsive grids and sections.'),
      entry('Design tokens', 'Keep type, color, and spacing consistent across pages.'),
      entry('The field guide', 'See how the pieces fit together, with examples you can inspect.'),
    ],
  });
  Object.assign(faq, {
    title: 'A few things to know.',
    items: [
      entry('Who is Forma for?', 'Independent designers and small teams setting up a design system.'),
      entry('Do I have to use the whole toolkit?', 'Start with the pieces you need. The layouts and tokens are designed to work independently.'),
      entry('Where should I start?', 'Explore the layout primitives first, then use the field guide to put them to work.'),
    ],
  });
  Object.assign(action, { title: 'Give your next project a better starting point.', body: 'Pick a layout, adjust the tokens, and make it your own.' });

  const philosophy = defaultPhilosophy(draft);
  philosophy.name = 'The Forma philosophy';
  philosophy.experience = 'Help independent designers see how a small set of well-made pieces fits together. Use confident, plain-language copy and leave breathing room between decisions.';
  draft.philosophyId = philosophy.id;
  return { version: 1, activeId: draft.id, drafts: [draft], philosophies: [philosophy], handoffs: {} };
}

export function exampleHandoff(): Handoff {
  return {
    relation: 'complement',
    context: 'Designers arrive from the toolkit’s primary action. Help them pick a starter layout, customize its tokens, and preview their first page.',
    brief: {
      name: 'Forma Quickstart',
      goal: 'onboard',
      audience: 'Independent designers using the toolkit for the first time',
      promise: 'Take a starter layout from first choice to a working page.',
      action: 'Open the setup steps',
      href: '#steps',
    },
    linkSource: true,
  };
}
