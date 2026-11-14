import './inspect.css';
import { isRecordKey, records } from './inspect-records';

const modes = ['render', 'wireframe', 'inspect'] as const;
type Mode = typeof modes[number];

const toolbar = document.createElement('div');
toolbar.className = 'inspect-toolbar';
toolbar.innerHTML = `
  <div class="inspect-mode-group" role="group" aria-label="Blueprint display mode">
    ${modes.map(mode => `
      <button type="button" class="inspect-mode" data-mode="${mode}" aria-pressed="false">
        <span class="inspect-icon icon-${mode}" aria-hidden="true"></span>
        ${mode[0].toUpperCase() + mode.slice(1)}
      </button>`).join('')}
  </div>`;
const modeButtons = [...toolbar.querySelectorAll<HTMLButtonElement>('[data-mode]')];

const dock = document.createElement('aside');
dock.className = 'reference-dock';
dock.id = 'reference-dock';
dock.setAttribute('aria-label', 'Reference Dock');
dock.hidden = true;
const sheet = document.createElement('dialog');
sheet.className = 'reference-sheet';
sheet.id = 'reference-sheet';
sheet.setAttribute('aria-labelledby', 'dock-heading');
const dockContent = document.createElement('div');
dockContent.className = 'dock-content';
dockContent.innerHTML = `
  <header class="dock-header">
    <h2 id="dock-heading"><span class="inspect-icon icon-target" aria-hidden="true"></span> Reference Dock</h2>
    <div class="dock-paging" hidden>
      <button type="button" class="dock-icon-button" data-step="-1" aria-label="Previous specimen">←</button>
      <button type="button" class="dock-icon-button" data-step="1" aria-label="Next specimen">→</button>
    </div>
    <button type="button" class="dock-icon-button dock-close" aria-label="Close reference">×</button>
  </header>
  <div class="dock-body">
    <div class="dock-summary">
      <div class="dock-tags">
        <code class="dock-element"></code>
        <span class="dock-tier"></span>
      </div>
      <h3 class="dock-title" tabindex="-1"></h3>
      <p class="dock-why"></p>
    </div>
    <section class="dock-section">
      <h4>Native primitives</h4>
      <ul class="dock-primitives"></ul>
    </section>
    <section class="dock-section dock-fallback">
      <h4>Fallback</h4>
      <p></p>
    </section>
    <section class="dock-section dock-source">
      <div class="dock-source-heading">
        <h4>Source excerpt</h4>
        <a class="dock-source-link" download>Download file <span aria-hidden="true">↓</span></a>
      </div>
      <div class="dock-code">
        <span class="dock-language"></span>
        <pre tabindex="0" aria-label="Source excerpt"><code></code></pre>
      </div>
    </section>
    <section class="dock-section">
      <h4>Documentation</h4>
      <ul class="dock-links"></ul>
    </section>
  </div>`;

dock.append(dockContent);
document.body.append(toolbar, dock, sheet);
const mobile = matchMedia('(max-width: 56rem)');
const nativePopover = typeof dock.showPopover === 'function' && typeof dock.hidePopover === 'function';
const nativeDialog = typeof sheet.showModal === 'function';
const title = dockContent.querySelector<HTMLElement>('.dock-title')!;
const body = dockContent.querySelector<HTMLElement>('.dock-body')!;
const close = dockContent.querySelector<HTMLButtonElement>('.dock-close')!;
const paging = dockContent.querySelector<HTMLElement>('.dock-paging')!;
const tier = dockContent.querySelector<HTMLElement>('.dock-tier')!;
const primitives = dockContent.querySelector<HTMLUListElement>('.dock-primitives')!;
const links = dockContent.querySelector<HTMLUListElement>('.dock-links')!;
const sourceLink = dockContent.querySelector<HTMLAnchorElement>('.dock-source-link')!;

const specimens = [...document.querySelectorAll<HTMLElement>('[data-inspect-record]')].flatMap(specimen => {
  const key = specimen.dataset.inspectRecord!;
  const controls = specimen.querySelector<HTMLElement>('[data-inspect-controls]');
  const target = specimen.querySelector<HTMLElement>('[data-inspect-target]');
  if (!isRecordKey(key) || !controls || !target) return [];

  const trigger = document.createElement('button');
  trigger.className = 'inspect-select';
  trigger.type = 'button';
  trigger.innerHTML = '<span class="inspect-icon icon-target" aria-hidden="true"></span> Inspect';
  trigger.setAttribute('aria-label', `Inspect ${records[key].name}`);
  trigger.setAttribute('aria-expanded', 'false');
  const hint = document.createElement('span');
  hint.className = 'inspect-hint';
  hint.setAttribute('aria-hidden', 'true');
  hint.textContent = records[key].element;
  controls.append(trigger, hint);

  return [{ record: records[key], target, trigger }];
});

type Specimen = typeof specimens[number];
type Presentation = 'sheet' | 'popover' | 'fixed';
let selected: Specimen | undefined;
let invoker: HTMLElement | undefined;
let presentation: Presentation | undefined;

const root = document.documentElement;
let current: Mode = 'render';
function setMode(mode: Mode) {
  if (mode !== 'inspect') dismissReference(false);
  current = mode;
  root.dataset.inspectMode = mode;
  for (const button of modeButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
  }
  try { sessionStorage.setItem('blueprint-inspect-mode', mode); } catch { /* Storage is optional. */ }
}

function activePresentation(): Presentation {
  if (mobile.matches) return nativeDialog ? 'sheet' : 'fixed';
  return nativePopover ? 'popover' : 'fixed';
}

function syncTriggerControls() {
  const forSheet = activePresentation() === 'sheet';
  for (const { trigger } of specimens) {
    trigger.setAttribute('aria-controls', forSheet ? sheet.id : dock.id);
    if (forSheet) trigger.setAttribute('aria-haspopup', 'dialog');
    else trigger.removeAttribute('aria-haspopup');
  }
}

function showDock() {
  presentation = activePresentation();
  root.dataset.referenceOpen = '';
  if (presentation === 'sheet') {
    sheet.append(dockContent);
    sheet.showModal();
  } else {
    dock.append(dockContent);
    dock.hidden = false;
    if (presentation === 'popover') {
      dock.setAttribute('popover', 'manual');
      dock.showPopover();
    }
  }
}

function hideDock() {
  if (presentation === 'sheet') sheet.close();
  if (presentation === 'popover') {
    dock.hidePopover();
    dock.removeAttribute('popover');
  }
  dock.hidden = true;
  presentation = undefined;
  delete root.dataset.referenceOpen;
}

function clearSelection() {
  selected?.trigger.setAttribute('aria-expanded', 'false');
  selected?.target.classList.remove('inspect-selected');
}

function dismissReference(restoreFocus = true) {
  if (!presentation) return;
  hideDock();
  clearSelection();
  selected = undefined;
  if (restoreFocus && invoker?.isConnected) invoker.focus();
  invoker = undefined;
}

function renderReference(specimen: Specimen) {
  clearSelection();
  selected = specimen;
  specimen.target.classList.add('inspect-selected');
  specimen.trigger.setAttribute('aria-expanded', 'true');
  const record = specimen.record;

  title.textContent = record.name;
  dockContent.querySelector('.dock-element')!.textContent = record.element;
  tier.textContent = record.tier;
  tier.classList.toggle('tier-enhancement', record.tier === 'Progressive enhancement');
  dockContent.querySelector('.dock-why')!.textContent = record.why;
  dockContent.querySelector('.dock-fallback p')!.textContent = record.fallback;
  dockContent.querySelector('.dock-language')!.textContent = record.source.language;
  dockContent.querySelector('.dock-code code')!.textContent = record.source.code;
  sourceLink.href = record.source.url;
  sourceLink.download = record.source.filename;

  primitives.replaceChildren(...record.primitives.map(primitive => {
    const item = document.createElement('li');
    const code = document.createElement('code');
    code.textContent = primitive;
    item.append(code);
    return item;
  }));
  links.replaceChildren(...record.docs.map(doc => {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = doc.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    const arrow = document.createElement('span');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '→';
    link.append(doc.label, arrow);
    item.append(link);
    return item;
  }));
  body.scrollTop = 0;
}

function openReference(specimen: Specimen, trigger: HTMLElement) {
  invoker = trigger;
  renderReference(specimen);
  if (!presentation) showDock();
  title.focus({ preventScroll: true });
}

modeButtons.forEach((button, index) => button.addEventListener('click', () => setMode(modes[index])));
specimens.forEach(specimen => specimen.trigger.addEventListener('click', () => openReference(specimen, specimen.trigger)));

const start = document.querySelector<HTMLButtonElement>('[data-inspect-start]');
if (start && specimens.length) {
  start.hidden = false;
  start.addEventListener('click', () => {
    setMode('inspect');
    openReference(specimens[0], start);
    specimens[0].target.closest('[data-inspect-record]')?.scrollIntoView({ block: 'start', behavior: 'instant' });
  });
}

if (!specimens.length) {
  const link = document.createElement('a');
  link.className = 'inspect-empty-link';
  link.href = document.querySelector<HTMLAnchorElement>('.site-header nav a[href$="components/"]')?.href ?? '../components/';
  link.textContent = 'Open specimens →';
  toolbar.prepend(link);
}

paging.hidden = specimens.length < 2;
paging.querySelectorAll<HTMLButtonElement>('[data-step]').forEach(button => {
  button.addEventListener('click', () => {
    if (!selected) return;
    const index = specimens.indexOf(selected) + Number(button.dataset.step);
    const next = specimens[(index + specimens.length) % specimens.length];
    renderReference(next);
    if (!mobile.matches) {
      next.target.closest('[data-inspect-record]')?.scrollIntoView({ block: 'nearest' });
    }
    title.focus({ preventScroll: true });
  });
});

close.addEventListener('click', () => dismissReference());
sheet.addEventListener('cancel', event => {
  event.preventDefault();
  dismissReference();
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || event.defaultPrevented || !presentation || document.querySelector('dialog[open]')) return;
  if (document.querySelector('.chromatic-settings[open]')?.contains(document.activeElement)) return;
  event.preventDefault();
  dismissReference();
});
mobile.addEventListener('change', () => {
  syncTriggerControls();
  if (presentation && presentation !== activePresentation()) {
    const focused = document.activeElement;
    hideDock();
    showDock();
    if (focused instanceof HTMLElement && dockContent.contains(focused)) focused.focus({ preventScroll: true });
    else if (presentation === 'sheet' || mobile.matches) title.focus({ preventScroll: true });
  }
});

syncTriggerControls();
try {
  const saved = sessionStorage.getItem('blueprint-inspect-mode');
  if (modes.some(mode => mode === saved)) current = saved as Mode;
} catch { /* Start in Render when storage is unavailable. */ }
setMode(current);
