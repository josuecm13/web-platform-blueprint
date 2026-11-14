import type { InspectRecordKey } from './inspect-records';

type LiveSpecimen = {
  page: '' | 'components/' | 'playground/';
  record: InspectRecordKey;
};

export const liveSpecimens = {
  'responsive-card': { page: 'components/', record: 'card' },
  'native-dialog': { page: 'components/', record: 'dialog' },
  'layer-shift': { page: 'components/', record: 'motion' },
  'native-disclosure': { page: '', record: 'disclosure' },
  'canvas-2d': { page: 'playground/', record: 'canvas' },
} satisfies Record<string, LiveSpecimen>;

export type LiveSpecimenId = keyof typeof liveSpecimens;

export function isLiveSpecimenId(id: string): id is LiveSpecimenId {
  return Object.hasOwn(liveSpecimens, id);
}

const mdn = 'https://developer.mozilla.org/en-US/docs';
const researchLinks: Readonly<Record<string, string>> = {
  subgrid: `${mdn}/Web/CSS/Guides/Grid_layout/Subgrid`,
  popover: `${mdn}/Web/API/Popover_API`,
  'view-transitions': `${mdn}/Web/API/View_Transition_API`,
  'scroll-timeline': `${mdn}/Web/CSS/Guides/Scroll-driven_animations`,
  'css-if': 'https://github.com/josuecm13/web-platform-blueprint/blob/main/docs/css-if-research.md',
};

export function specimenLink(id: string, siteRoot: string) {
  if (isLiveSpecimenId(id)) return `${siteRoot}${liveSpecimens[id].page}#${id}`;
  if (Object.hasOwn(researchLinks, id)) return researchLinks[id];
  throw new Error(`Unknown specimen link: ${id}`);
}
