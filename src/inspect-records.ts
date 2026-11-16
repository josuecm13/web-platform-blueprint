/// <reference types="vite/client" />
import pageSource from '../components/index.html?url&no-inline';
import homeSource from '../index.html?url&no-inline';
import canvasSource from '../playground/index.html?url&no-inline';
import layoutSource from './style.css?url&no-inline';
import specimenStyles from './specimens.css?url&no-inline';
import workspaceStyles from './workspace.css?url&no-inline';

import creatorStyles from './creator/page.css?url&no-inline';
import creatorRenderer from './creator/render-page.ts?url&no-inline';

type Reference = { label: string; url: string };
type Tier = 'Baseline' | 'Progressive enhancement';

type RecordEntry = {
  name: string;
  element: string;
  tier: Tier;
  primitives: string[];
  why: string;
  fallback: string;
  source: { language: 'CSS' | 'HTML'; code: string; url: string; filename: string };
  docs: Reference[];
};

const mdn = 'https://developer.mozilla.org/en-US/docs';

export const records = {
  creatorGroup: {
    name: 'Responsive layout group', element: '<section>', tier: 'Progressive enhancement',
    primitives: ['CSS Grid', 'Container queries', 'minmax()'],
    why: 'Compose several regions as a unit. A responsive row keeps the same reading order when it stacks.',
    fallback: 'Group children remain stacked when the canvas is narrow or container queries are unavailable.',
    source: { language: 'CSS', code: '@container layout-group (min-width: 30rem) { .group[data-arrangement="row"] { grid-template-columns: repeat(2, minmax(0, 1fr)); } }', url: creatorStyles, filename: 'page.css' },
    docs: [{ label: 'CSS container queries', url: `${mdn}/Web/CSS/Guides/Containment/Container_queries` }],
  },
  creatorMotion: {
    name: 'Scroll-driven motion', element: '<section>', tier: 'Progressive enhancement',
    primitives: ['animation-timeline: view()', 'animation-range', 'prefers-reduced-motion'],
    why: 'Use the region’s movement through the canvas to advance the effect. Scrub the canvas to compare different offsets.',
    fallback: 'Regions stay at full opacity in their final position when timelines are unavailable or reduced motion is active.',
    source: { language: 'CSS', code: '.region { animation-timeline: view(); animation-range: entry 0% entry 100%; }', url: creatorStyles, filename: 'page.css' },
    docs: [
      { label: 'Animation timeline', url: `${mdn}/Web/CSS/Reference/Properties/animation-timeline` },
      { label: 'Animation range', url: `${mdn}/Web/CSS/Reference/Properties/animation-range` },
    ],
  },
  creatorHero: {
    name: 'Responsive split section', element: '<section>', tier: 'Baseline',
    primitives: ['CSS Grid', 'Container queries', 'minmax()'],
    why: 'Compare paired regions without changing their reading order.',
    fallback: 'The regions remain stacked in document order at narrow widths or without CSS Grid.',
    source: { language: 'CSS', code: '@container layout-canvas (min-width: 38rem) { .split { grid-template-columns: repeat(2, minmax(0, 1fr)); } }', url: creatorStyles, filename: 'page.css' },
    docs: [{ label: 'CSS Grid layout', url: `${mdn}/Web/CSS/Guides/Grid_layout` }],
  },
  creatorGrid: {
    name: 'Responsive card grid', element: '<ul>', tier: 'Baseline',
    primitives: ['CSS Grid', 'Container queries', 'Custom properties'],
    why: 'Try one, two, or several columns while preserving list order.',
    fallback: 'Cards stay in list order without CSS Grid.',
    source: { language: 'CSS', code: '.tiles { grid-template-columns: repeat(var(--columns), minmax(0, 1fr)); }', url: creatorStyles, filename: 'page.css' },
    docs: [{ label: 'CSS Grid layout', url: `${mdn}/Web/CSS/Guides/Grid_layout` }],
  },
  creatorNav: {
    name: 'Prototype navigation', element: '<nav>', tier: 'Baseline',
    primitives: ['<nav>', '<a href>', 'Fragment navigation'],
    why: 'Test the order in which a user can reach page regions.',
    fallback: 'Plain fragment links work without layout styles.',
    source: { language: 'HTML', code: '<nav aria-label="Prototype navigation"><a href="#region">Region</a></nav>', url: creatorRenderer, filename: 'render-page.ts' },
    docs: [{ label: 'HTML nav element', url: `${mdn}/Web/HTML/Reference/Elements/nav` }],
  },
  creatorAction: {
    name: 'Journey action', element: '<button>', tier: 'Progressive enhancement',
    primitives: ['<button>', 'click event', 'Visible focus'],
    why: 'Test a deliberate transition into a linked layout.',
    fallback: 'An unlinked action is shown as a placeholder at the intended position.',
    source: { language: 'HTML', code: '<button type="button" data-follow>Continue to next layout</button>', url: creatorRenderer, filename: 'render-page.ts' },
    docs: [{ label: 'HTML button element', url: `${mdn}/Web/HTML/Reference/Elements/button` }],
  },
  creatorText: {
    name: 'Text hierarchy', element: '<section>', tier: 'Baseline',
    primitives: ['<section>', 'max-inline-size', 'Block flow'],
    why: 'Compare line length and vertical rhythm with abstract placeholders.',
    fallback: 'Regions follow document order without styles.',
    source: { language: 'CSS', code: '.reading { max-inline-size: 40rem; margin-inline: auto; }', url: creatorStyles, filename: 'page.css' },
    docs: [{ label: 'max-inline-size', url: `${mdn}/Web/CSS/Reference/Properties/max-inline-size` }],
  },
  creatorMedia: {
    name: 'Media slot', element: '<div>', tier: 'Baseline',
    primitives: ['aspect-ratio', 'Border box'],
    why: 'Reserve a rectangle of predictable proportions while testing page rhythm.',
    fallback: 'Adjacent regions remain in order if the placeholder has no inherent height.',
    source: { language: 'CSS', code: '.media { aspect-ratio: 2.15; min-width: 0; }', url: creatorStyles, filename: 'page.css' },
    docs: [{ label: 'aspect-ratio', url: `${mdn}/Web/CSS/Reference/Properties/aspect-ratio` }],
  },

  card: {
    name: 'Responsive card',
    element: '<article>',
    tier: 'Progressive enhancement',
    primitives: ['CSS Grid', 'container-type', '@container'],
    why: 'One card can fit a narrow sidebar or a wide canvas at the same viewport size. The layout responds to the width it actually receives.',
    fallback: 'A single-column grid keeps the artwork and copy readable. The preview can still be narrowed.',
    source: {
      language: 'CSS',
      code: `.resize-frame { container-type: inline-size; }
.lab-adaptive {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
}

@container (min-width: 550px) {
  #responsive-card:not([data-fallback-active]) .lab-adaptive {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}`,
      url: specimenStyles,
      filename: 'specimens.css',
    },
    docs: [
      { label: 'Container queries', url: `${mdn}/Web/CSS/Guides/Containment/Container_queries` },
      { label: 'CSS Grid layout', url: `${mdn}/Web/CSS/Guides/Grid_layout` },
    ],
  },
  libraryGrid: {
    name: 'Library grid',
    element: '<div>',
    tier: 'Baseline',
    primitives: ['CSS Grid', 'repeat()', 'minmax()', '@media'],
    why: 'The Library fits more specimens across a wide viewport. Matching cards reflow into the same tracks when the search or category changes.',
    fallback: 'The cards follow the same document order and remain readable without the multi-column grid.',
    source: {
      language: 'CSS',
      code: `.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }

@media (max-width: 850px) {
  .three { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 560px) {
  .three { grid-template-columns: 1fr; }
}`,
      url: layoutSource,
      filename: 'style.css',
    },
    docs: [
      { label: 'CSS Grid layout', url: `${mdn}/Web/CSS/Guides/Grid_layout` },
      { label: 'Using media queries', url: `${mdn}/Web/CSS/Guides/Media_queries/Using` },
    ],
  },
  workspaceOverview: {
    name: 'Workspace overview grid',
    element: '<div>',
    tier: 'Baseline',
    primitives: ['CSS Grid', 'auto-fit', 'minmax()', 'Custom properties'],
    why: 'The overview uses the width of its own grid to line up summary cards. Dock reflow and density changes can happen without adding a separate layout for every width.',
    fallback: 'The three metrics stay readable in document order when grid styling is unavailable.',
    source: {
      language: 'CSS',
      code: `.workspace-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 9rem), 1fr));
  gap: .6rem;
}`,
      url: workspaceStyles,
      filename: 'workspace.css',
    },
    docs: [
      { label: 'CSS Grid layout', url: `${mdn}/Web/CSS/Guides/Grid_layout` },
    ],
  },
  workspaceActivity: {
    name: 'Workspace activity table',
    element: '<table>',
    tier: 'Baseline',
    primitives: ['<caption>', '<th scope="col">', 'overflow: auto', 'position: sticky', 'aria-sort'],
    why: 'One focusable scroll region keeps a wide table usable on narrow screens. Sticky column headers keep the meaning of each cell visible while browsing long datasets.',
    fallback: 'If sticky positioning is unavailable, headers scroll with the table. Without JavaScript, the typical sample rows are still present in the HTML.',
    source: {
      language: 'CSS',
      code: `.workspace-table-region {
  max-block-size: min(28rem, 61vh);
  overflow: auto;
}

.workspace-table-region th {
  position: sticky;
  inset-block-start: 0;
}`,
      url: workspaceStyles,
      filename: 'workspace.css',
    },
    docs: [
      { label: 'HTML table element', url: `${mdn}/Web/HTML/Reference/Elements/table` },
      { label: 'CSS positioning', url: `${mdn}/Web/CSS/Reference/Properties/position` },
    ],
  },
  dialog: {
    name: 'Native dialog',
    element: '<dialog>',
    tier: 'Baseline',
    primitives: ['showModal()', 'method="dialog"', '::backdrop'],
    why: 'A modal task needs the browser to keep focus inside it, make the background inert, and dismiss the dialog on Escape.',
    fallback: 'An inline disclosure contains the same text when native dialogs or JavaScript are unavailable.',
    source: {
      language: 'HTML',
      code: `<dialog aria-labelledby="dialog-title">
  <h2 id="dialog-title">A native dialog.</h2>
  <form method="dialog">
    <button autofocus>Close dialog</button>
  </form>
</dialog>`,
      url: pageSource,
      filename: 'index.html',
    },
    docs: [
      { label: 'HTML dialog element', url: `${mdn}/Web/HTML/Reference/Elements/dialog` },
      { label: 'HTML Standard', url: 'https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element' },
    ],
  },
  motion: {
    name: 'Layer shift',
    element: '<input type="checkbox">',
    tier: 'Baseline',
    primitives: [':checked', 'CSS transitions', 'prefers-reduced-motion'],
    why: 'The shift shows how the plates are stacked. A native checkbox gives pointer, touch, and keyboard input the same control.',
    fallback: 'With reduced motion enabled or without CSS translation and transition support, the plates stay in place and the top plate changes color to show the selected state.',
    source: {
      language: 'CSS',
      code: `.lab-motion-toggle:checked ~ .lab-motion-art i:last-child {
  background: #205e50;
}

@supports (translate: 1px 0) and (transition: translate 1s) {
  @media (prefers-reduced-motion: no-preference) {
    html:not([data-motion="reduce"]) #layer-shift:not([data-fallback-active]) {
      .lab-motion-art i {
        transition: translate .34s ease, background-color .24s ease;
      }
      .lab-motion-toggle:checked ~ .lab-motion-art i {
        translate: var(--shift) 0;
      }
    }
  }
}`,
      url: specimenStyles,
      filename: 'specimens.css',
    },
    docs: [
      { label: 'CSS transitions', url: `${mdn}/Web/CSS/Guides/Transitions` },
      { label: 'Reduced motion', url: `${mdn}/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion` },
    ],
  },
  disclosure: {
    name: 'Native disclosure',
    element: '<details>',
    tier: 'Baseline',
    primitives: ['<details>', '<summary>', 'name'],
    why: 'The FAQ uses semantic disclosure controls for keyboard, touch, and pointer input. A shared name groups the disclosures so supported browsers open one answer at a time.',
    fallback: 'If grouping is unavailable, each answer can still be opened independently.',
    source: {
      language: 'HTML',
      code: `<details name="faq">
  <summary>What is this project?</summary>
  <p>A complete web application and a field guide to browser-native capabilities.</p>
</details>`,
      url: homeSource,
      filename: 'index.html',
    },
    docs: [
      { label: 'HTML details element', url: `${mdn}/Web/HTML/Reference/Elements/details` },
    ],
  },
  canvas: {
    name: 'Canvas 2D',
    element: '<canvas>',
    tier: 'Baseline',
    primitives: ['CanvasRenderingContext2D', 'Pointer Events', 'ResizeObserver'],
    why: 'The drawing surface maps pointer input to a square on a grid. Directional buttons let readers explore the same position with the keyboard.',
    fallback: 'The drawing experiment includes a text description and position readout. If JavaScript is disabled, the description remains readable.',
    source: {
      language: 'HTML',
      code: `<canvas id="board" width="900" height="400"
  aria-label="A square on a grid; use the directional buttons to move it">
  Your browser does not support canvas.
</canvas>
<button data-move="left">← Left</button>
<p id="position" aria-live="polite">Square position: center.</p>`,
      url: canvasSource,
      filename: 'index.html',
    },
    docs: [
      { label: 'Canvas API', url: `${mdn}/Web/API/Canvas_API` },
      { label: 'Pointer Events', url: `${mdn}/Web/API/Pointer_events` },
    ],
  },
  heading: {
    name: 'Chromatic heading',
    element: '<h1>',
    tier: 'Baseline',
    primitives: ['text-shadow', 'CSS transitions', ':hover', 'prefers-reduced-motion'],
    why: 'A brief color split adds visual emphasis to the page heading. The heading stays ordinary, readable text.',
    fallback: 'Reduced motion removes the translation and color split. Without hover, the heading remains readable.',
    source: {
      language: 'CSS',
      code: `.hero h1:hover {
  transform: translateX(.04em);
  text-shadow: -3px 0 rgb(255 52 92 / .42),
                3px 0 rgb(0 164 255 / .42);
}`,
      url: layoutSource,
      filename: 'style.css',
    },
    docs: [
      { label: 'Text shadow', url: `${mdn}/Web/CSS/Reference/Properties/text-shadow` },
      { label: 'Reduced motion', url: `${mdn}/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion` },
    ],
  },
} satisfies Record<string, RecordEntry>;

export type InspectRecordKey = keyof typeof records;

export function isRecordKey(key: string): key is InspectRecordKey {
  return Object.hasOwn(records, key);
}
