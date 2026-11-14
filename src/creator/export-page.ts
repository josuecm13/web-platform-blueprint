import artwork from './assets/forma.webp?inline';
import serif from './assets/instrument-serif-latin.woff2?inline';
import sans from './assets/inter-latin.woff2?inline';
import interLicense from './assets/OFL-Inter.txt?raw';
import serifLicense from './assets/OFL-Instrument-Serif.txt?raw';
import { type Draft } from './model';
import { exportPage } from './render-page';

const fonts = `/*
${interLicense}
${serifLicense}
*/
@font-face { font-family: "Instrument Serif"; src: url("${serif}") format("woff2"); font-display: swap; }
@font-face { font-family: Inter; src: url("${sans}") format("woff2"); font-weight: 400 750; font-display: swap; }`;

export function htmlDownload(draft: Draft, href: string) {
  return exportPage(draft, artwork, fonts, href);
}
