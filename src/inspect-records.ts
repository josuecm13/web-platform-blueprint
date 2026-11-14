/// <reference types="vite/client" />
import pageSource from '../components/index.html?url&no-inline';
import layoutSource from './style.css?url&no-inline';
import specimenStyles from './specimens.css?url&no-inline';

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
  .lab-adaptive {
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
    fallback: 'With reduced motion enabled, the plates stay in place and the top plate changes color to show the selected state.',
    source: {
      language: 'CSS',
      code: `.lab-motion-toggle:checked ~ .lab-motion-art i {
  translate: var(--shift) 0;
}

@media (prefers-reduced-motion: reduce) {
  .lab-motion-toggle:checked ~ .lab-motion-art i {
    translate: none;
    transition: none;
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

export function isRecordKey(key: string): key is keyof typeof records {
  return Object.hasOwn(records, key);
}
