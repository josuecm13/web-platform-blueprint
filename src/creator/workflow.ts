import { goals, sectionTypes, themes, tones, workflowReferences, type Draft, type Handoff, type Philosophy, type ReferenceId } from './model';

export const relationLabels = { sibling: 'Same philosophy', complement: 'Complementary page' } as const;

export function workflowPrompt(source: Draft, philosophy: Philosophy, handoff: Handoff, referenceUrl: (id: ReferenceId) => string, targetDestination?: string) {
  const { brief, relation, context } = handoff;
  const same = relation === 'sibling';
  const required = philosophy.rules.filter(rule => rule.required && rule.text.trim()).map(rule => `- ${rule.text.trim()}`);
  const guidance = philosophy.rules.filter(rule => !rule.required && rule.text.trim()).map(rule => `- ${rule.text.trim()}`);
  const references = philosophy.references.map(key => `- [${workflowReferences[key]}](${referenceUrl(key)})`);
  const sourceSections = source.sections.map(section => sectionTypes[section.kind].label).join(' → ');
  const actionPlacement = philosophy.actionPolicy === 'single'
    ? 'Give the primary action one placement.'
    : 'Repeat the same primary action at a later decision point if it helps the visitor.';

  return [
    `# Build ${brief.name.trim() || 'the next page'}`,
    same
      ? 'Build a sibling page with the same UX philosophy. Adapt the content and section choices to this page’s own goal.'
      : 'Build a complementary page that continues the source page’s journey. Orient the visitor at arrival and give them a clear action to move forward.',
    '## Source page',
    [
      `- Page: ${source.brief.name}`,
      `- Goal: ${goals[source.brief.goal]}`,
      `- Audience: ${source.brief.audience || 'Unspecified'}`,
      `- Primary action: ${source.brief.action || 'Unspecified'}`,
      source.brief.promise && `- Promise: ${source.brief.promise}`,
      sourceSections && `- Section order: ${sourceSections}`,
    ].filter(Boolean).join('\n'),
    '## Target page',
    [
      `- Goal: ${goals[brief.goal]}`,
      `- Audience: ${brief.audience || source.brief.audience || 'Define for this page'}`,
      brief.promise && `- Page promise: ${brief.promise}`,
      `- Primary action: ${brief.action || 'Define one action for this page'}`,
      (targetDestination || brief.href.trim()) && `- Action destination: ${targetDestination || brief.href.trim()}`,
      !same && `- Arrival from source: ${source.brief.action || source.brief.name}`,
      (context.trim() || !same) && `- ${same ? 'Connection' : 'Handoff and visitor needs'}: ${context.trim() || 'Describe what the visitor has just done and needs next.'}`,
    ].filter(Boolean).join('\n'),
    `## Build philosophy · ${philosophy.name || 'Shared UX'}`,
    [
      philosophy.experience && `- Desired experience: ${philosophy.experience}`,
      `- Tone: ${tones[philosophy.tone]}`,
      `- Visual palette: ${themes[philosophy.theme]}`,
      `- Action convention: ${actionPlacement}`,
    ].filter(Boolean).join('\n'),
    ...(required.length ? ['## Inherited requirements', required.join('\n')] : []),
    ...(guidance.length ? ['## Adaptable guidance', guidance.join('\n')] : []),
    ...(references.length ? ['## Blueprint references', references.join('\n')] : []),
    '## Acceptance criteria',
    [
      '- Make the target page’s primary action clear.',
      ...(!same ? ['- Make the transition from the source page understandable at arrival.'] : []),
      '- Name the reason for each section and how it supports this page’s goal.',
      '- Preserve the inherited requirements. Explain any adapted guidance.',
      '- Keep core content and navigation usable without JavaScript. Check keyboard navigation and narrow widths.',
    ].join('\n'),
  ].join('\n\n');
}
