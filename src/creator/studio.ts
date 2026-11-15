import { closePreviewReference, displayMode, inspectPreview, setMode, type Mode } from '../inspect';
import { applyPreferences, readPreferences } from '../preferences';
import { specimenLink } from '../specimen-registry';
import { bindDrag, type Point } from './drag';
import { iconMarkup, mountIcons } from './icons';
import { allBlocks, arrangements, block, buildPrompt, copyBlock, effects, insertion, intensities, limit, loadProject, locate, patterns, presets, ranges, saveProject, sheet, spacings,
  type Block, type Placement, type Pattern, type Preset, type Project, type Sheet } from './model';
import { createCanvas } from './preview';

const get = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const buttons = get('#palette-items');
const picker = get<HTMLSelectElement>('#sheet-picker');
const outline = get('#outline');
const properties = get('#properties');
const dialog = get<HTMLDialogElement>('#new-dialog');
const related = get<HTMLFormElement>('#related');
const philosophy = get<HTMLTextAreaElement>('#philosophy');
const scrubber = get<HTMLInputElement>('#scrubber');
const prompt = get<HTMLTextAreaElement>('#prompt');
const siteRoot = new URL('../', location.href).href;

applyPreferences(readPreferences());
let project = loadProject();
let playing = false;
let staticMotion = false;
let selected: string | undefined = current().blocks[0]?.id;
type Dragged = { kind: Pattern } | { id: string };
let dragPoint: Point | undefined;
let dragFrame = 0;
const ghost = document.createElement('div');
ghost.className = 'drag-ghost';
ghost.hidden = true;
document.body.append(ghost);
const undo: Project[] = [];
const redo: Project[] = [];

function current() { return project.sheets.find(item => item.id === project.active)!; }
function nextSheet() { return project.sheets.find(item => item.id === current().next); }
function currentBlock() { return allBlocks(current().blocks).find(item => item.id === selected); }
function notify(text: string) { get('#feedback').textContent = text; }

function moveDrag(entry: Dragged, point: Point) {
  const kind = 'kind' in entry ? entry.kind : allBlocks(current().blocks).find(item => item.id === entry.id)?.kind;
  if (!kind) return;
  ghost.textContent = patterns[kind].label;
  ghost.hidden = false;
  ghost.style.translate = `${point.x + 13}px ${point.y + 13}px`;
  dragPoint = point;
  canvas.dragging(true);
  if (dragFrame) return;
  function update() {
    if (!dragPoint) return;
    canvas.dropSpot(dragPoint, true);
    dragFrame = requestAnimationFrame(update);
  }
  dragFrame = requestAnimationFrame(update);
}

function finishDrag(entry: Dragged, point?: Point) {
  const destination = point && canvas.dropSpot(point);
  cancelAnimationFrame(dragFrame);
  dragFrame = 0;
  dragPoint = undefined;
  ghost.hidden = true;
  canvas.clearDrop();
  canvas.dragging(false);
  if (!destination) return;
  setPlaying(false);
  if ('kind' in entry) add(entry.kind, destination);
  else move(entry.id, destination);
}

const canvas = createCanvas(get('#canvas'), {
  pick(id, inspect) { pick(id); if (inspect) inspectBlock(); },
  follow() { const page = nextSheet(); if (page) open(page); },
  moveDrag(id, point) { moveDrag({ id }, point); },
  finishDrag(id, point) { finishDrag({ id }, point); },
  resize(width) { if (width) get('#device-width').textContent = `${width} px`; },
  scroll(percent, available) {
    scrubber.value = String(percent);
    scrubber.disabled = !available;
    scrubber.setAttribute('aria-valuetext', `${percent}% scrolled`);
    get('#scroll-position').textContent = `${percent}%`;
  },
});

function persist() {
  get('#save-status').textContent = saveProject(project) ? 'Saved on this device' : 'Storage unavailable · changes are in this tab';
}

function commit(update: () => void) {
  undo.push(structuredClone(project));
  if (undo.length > 40) undo.shift();
  redo.length = 0;
  update();
  persist();
  historyButtons();
}

function historyButtons() {
  get<HTMLButtonElement>('[data-action="undo"]').disabled = !undo.length;
  get<HTMLButtonElement>('[data-action="redo"]').disabled = !redo.length;
}

function restore(from: Project[], to: Project[]) {
  if (!from.length) return;
  to.push(structuredClone(project));
  project = from.pop()!;
  selected = current().blocks[0]?.id;
  draw(true);
  renderWorkflow(true);
  persist();
}

function draw(reset = false) {
  closePreviewReference();
  const page = current();
  picker.replaceChildren(...project.sheets.map(item => new Option(item.name, item.id, false, item.id === page.id)));
  get('#device-name').textContent = page.name;
  get('#block-count').textContent = String(allBlocks(page.blocks).length);
  canvas.render(page, Boolean(nextSheet()), reset);
  pick(selected);
  historyButtons();
}

function makeOptions(values: Record<string, string>, selected: string) {
  return Object.entries(values).map(([id, name]) => `<option value="${id}"${id === selected ? ' selected' : ''}>${name}</option>`).join('');
}

function pick(value?: string, scroll = false) {
  if (selected !== value) closePreviewReference();
  selected = value;
  canvas.select(value, scroll);
  const blocks = current().blocks;
  function rows(items: Block[]): string {
    return items.map(item => `<li><button type="button" data-action="pick" data-id="${item.id}"${value === item.id ? ' aria-current="true"' : ''}>${iconMarkup(patterns[item.kind].icon)}${patterns[item.kind].label}</button>
      ${item.children?.length ? `<ol>${rows(item.children)}</ol>` : ''}</li>`).join('');
  }
  outline.innerHTML = rows(blocks);
  const location = locate(blocks, value);
  if (!location) {
    properties.innerHTML = '<p>Select an element to adjust its layout and motion.</p>';
    return;
  }
  const { items, index, parent } = location;
  const item = items[index];
  const descendants = new Set(allBlocks([item]).map(block => block.id));
  const containers: Record<string, string> = { root: 'Canvas' };
  let groupNumber = 0;
  for (const group of allBlocks(blocks).filter(block => block.kind === 'group')) {
    groupNumber++;
    if (!descendants.has(group.id)) containers[group.id] = `Layout group ${groupNumber}`;
  }
  properties.innerHTML = `
    <h3>${patterns[item.kind].label}</h3><p>${patterns[item.kind].description}</p>
    <label>Spacing<select name="spacing">${makeOptions(spacings, item.spacing)}</select></label>
    ${item.kind === 'grid' ? `<label>Columns on wide screens<select name="columns">${makeOptions({'2':'2','3':'3','4':'4'}, String(item.columns))}</select></label>` : ''}
    ${Object.keys(containers).length > 1 ? `<label>Container<select name="container">${makeOptions(containers, parent?.id ?? 'root')}</select></label>` : ''}
    ${item.kind === 'group' ? `<label>Arrangement<select name="arrangement">${makeOptions(arrangements, item.arrangement ?? 'stack')}</select></label>` : ''}
    <label>Scroll effect<select name="effect">${makeOptions(effects, item.effect)}</select></label>
    ${item.effect !== 'none' ? `
      <label>Scroll range<select name="range">${makeOptions(ranges, item.range ?? 'entry')}</select></label>
      <label>Intensity<select name="intensity">${makeOptions(intensities, item.intensity ?? 'regular')}</select></label>
      <button type="button" data-action="motion-start">Jump before effect</button><button type="button" data-action="inspect-motion">Inspect scroll motion</button>` : ''}
    <div class="studio-segments" role="group" aria-label="Element actions">
      <button type="button" data-action="up" aria-label="Move up"${index === 0 ? ' disabled' : ''}>${iconMarkup('up')}</button>
      <button type="button" data-action="down" aria-label="Move down"${index === items.length - 1 ? ' disabled' : ''}>${iconMarkup('down')}</button>
      <button type="button" data-action="duplicate" aria-label="Duplicate element">${iconMarkup('copy')}</button>
      <button type="button" data-action="remove" aria-label="Remove element">${iconMarkup('trash')}</button>
    </div>
    <button type="button" data-action="inspect">Inspect pattern</button>`;
}

function add(kind: Pattern, placement: Placement, copy?: Block) {
  const blocks = current().blocks;
  if (allBlocks(blocks).length + (copy ? allBlocks([copy]).length : 1) > limit) return notify('Element limit reached.');
  const destination = insertion(blocks, placement);
  if (!destination) return;
  const item = copy ? copyBlock(copy) : block(kind);
  commit(() => destination.items.splice(destination.index, 0, item));
  selected = item.id;
  draw();
  canvas.select(item.id, true);
  notify(`${patterns[kind].label} added.`);
}

function move(source: string, placement: Placement) {
  const blocks = current().blocks;
  const origin = locate(blocks, source);
  const destination = insertion(blocks, placement);
  if (!origin || !destination) return;
  const item = origin.items[origin.index];
  if (allBlocks([item]).some(block => block.id === placement.target)) return;
  const sameList = origin.items === destination.items;
  const index = destination.index - Number(sameList && destination.index > origin.index);
  if (sameList && origin.index === index) return;
  commit(() => {
    origin.items.splice(origin.index, 1);
    destination.items.splice(index, 0, item);
  });
  selected = item.id;
  draw();
  canvas.select(item.id, true);
  notify(placement.position === 'inside' ? 'Moved into group.' : `Moved to position ${index + 1}.`);
}

function inspectBlock(motion = false) {
  const item = currentBlock();
  const target = item && canvas.node(item.id);
  if (!item || !target) return;
  const keys = { group: 'creatorGroup', nav: 'creatorNav', split: 'creatorHero', grid: 'creatorGrid', stack: 'creatorText', media: 'creatorMedia', disclosure: 'disclosure', action: 'creatorAction' } as const;
  const specimen = item.kind === 'disclosure' ? 'native-disclosure' : item.kind === 'grid' ? 'responsive-card' : undefined;
  inspectPreview(motion ? 'creatorMotion' : keys[item.kind], target, get(motion ? '[data-action="inspect-motion"]' : '[data-action="inspect"]'), {
    grid: motion ? undefined : target.querySelector<HTMLElement>(':scope > .region > .measure, :scope > .region > .group-frame > .measure') ?? undefined,
    related: !motion && specimen ? { label: 'Open Library specimen', url: specimenLink(specimen, siteRoot) } : undefined,
  });
}

function workspace(next: 'compose' | 'workflow') {
  closePreviewReference();
  get('#compose').hidden = next !== 'compose';
  get('#workflow').hidden = next !== 'workflow';
  for (const name of ['compose', 'workflow']) {
    const tab = get(`[data-action="${name}"]`);
    tab.setAttribute('aria-selected', String(name === next));
    tab.tabIndex = name === next ? 0 : -1;
  }
  if (next === 'workflow') renderWorkflow();
}

function open(page: Sheet) {
  project.active = page.id;
  selected = page.blocks[0]?.id;
  workspace('compose');
  draw(true);
  renderWorkflow(true);
  persist();
  picker.focus();
}

function renderWorkflow(reset = false) {
  const source = current();
  if (reset) related.reset();
  if (document.activeElement !== philosophy) philosophy.value = source.philosophy;
  const form = new FormData(related);
  const relation = form.get('relation') === 'next' ? 'next' : 'sibling';
  const note = String(form.get('handoff') || '');
  const upstream = source.origin && project.sheets.find(item => item.id === source.origin?.id);
  const next = nextSheet();
  get('#journey').textContent = [upstream?.name, source.name, next?.name].filter(Boolean).join(' → ');
  get('#handoff-label').firstChild!.textContent = relation === 'next' ? 'Where visitors arrive from and what they do next' : 'Experience to design';
  prompt.value = buildPrompt(source, String(form.get('name') || ''), relation, note);
}

buttons.innerHTML = Object.entries(patterns).map(([kind, value]) =>
  `<button type="button" data-action="add" data-kind="${kind}">${iconMarkup(value.icon)}${value.label}</button>`).join('');
bindDrag(buttons, target => {
  const handle = target.closest<HTMLButtonElement>('[data-kind]');
  if (handle) return { handle, value: { kind: handle.dataset.kind as Pattern } };
}, event => ({ x: event.clientX, y: event.clientY }), { move: moveDrag, finish: finishDrag });
picker.addEventListener('change', () => open(project.sheets.find(item => item.id === picker.value)!));
properties.addEventListener('change', event => {
  const input = event.target as HTMLSelectElement;
  const item = currentBlock();
  if (!item || !input.name) return;
  if (input.name === 'container') {
    move(item.id, { target: input.value === 'root' ? undefined : input.value, position: 'inside' });
    properties.querySelector<HTMLElement>('[name="container"]')?.focus({ preventScroll: true });
    return;
  }
  commit(() => {
    if (input.name === 'columns') item.columns = Number(input.value) as Block['columns'];
    if (input.name === 'spacing') item.spacing = input.value as Block['spacing'];
    if (input.name === 'effect') item.effect = input.value as Block['effect'];
    if (input.name === 'arrangement') item.arrangement = input.value as Block['arrangement'];
    if (input.name === 'range') item.range = input.value as Block['range'];
    if (input.name === 'intensity') item.intensity = input.value as Block['intensity'];
  });
  draw();
  properties.querySelector<HTMLElement>(`[name="${input.name}"]`)?.focus({ preventScroll: true });
  if (input.name === 'effect' && item.effect !== 'none') {
    notify('Scroll the canvas to preview this effect.');
  }
});
related.addEventListener('input', () => {
  if (current().philosophy !== philosophy.value) {
    current().philosophy = philosophy.value;
    persist();
  }
  renderWorkflow();
});
related.addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(related);
  const name = String(data.get('name') || '').trim();
  if (!name || project.sheets.length >= limit) return notify('Enter a layout name and check the project has space.');
  const source = current();
  const relation = data.get('relation') === 'next' ? 'next' : 'sibling';
  const target = sheet(name, relation === 'next' ? 'flow' : 'blank');
  target.philosophy = source.philosophy;
  if (data.has('inherit')) target.blocks = source.blocks.map(copyBlock);
  target.origin = { id: source.id, relation, handoff: String(data.get('handoff') ?? '') };
  commit(() => {
    if (relation === 'next') {
      source.next = target.id;
      if (!allBlocks(source.blocks).some(item => item.kind === 'action') && allBlocks(source.blocks).length < limit) source.blocks.push(block('action'));
    }
    project.sheets.push(target);
  });
  open(target);
  notify('Related layout created.');
});

const presetPicker = get<HTMLSelectElement>('#preset-picker');
presetPicker.replaceChildren(...Object.entries(presets).map(([id, value]) => new Option(value.label, id)));
get<HTMLFormElement>('#new-layout').addEventListener('submit', event => {
  event.preventDefault();
  const form = new FormData(event.currentTarget as HTMLFormElement);
  const name = String(form.get('name')).trim();
  if (!name || project.sheets.length >= limit) return;
  const layout = sheet(name, presetPicker.value as Preset);
  commit(() => project.sheets.push(layout));
  dialog.close();
  open(layout);
});

const actions: Record<string, (button: HTMLButtonElement) => void> = {
  compose: () => workspace('compose'),
  workflow: () => workspace('workflow'),
  new: () => { if (project.sheets.length < limit) dialog.showModal(); else notify('Layout limit reached.'); },
  cancel: () => dialog.close(),
  add: button => { setPlaying(false); add(button.dataset.kind as Pattern, { target: selected, position: currentBlock()?.kind === 'group' ? 'inside' : 'after' }); },
  pick: button => { pick(button.dataset.id, true); outline.querySelector<HTMLElement>('[aria-current]')?.focus({ preventScroll: true }); },
  up: () => step(-1),
  down: () => step(1),
  inspect: () => inspectBlock(),
  'inspect-motion': () => inspectBlock(true),
  'static-motion': button => {
    staticMotion = !staticMotion;
    button.setAttribute('aria-pressed', String(staticMotion));
    canvas.staticMotion(staticMotion);
    showMotionStatus();
  },
  duplicate: () => { const item = currentBlock(); if (item) add(item.kind, { target: item.id, position: 'after' }, item); },
  remove: () => {
    const origin = locate(current().blocks, selected);
    if (!origin) return;
    const { items, index, parent } = origin;
    commit(() => items.splice(index, 1));
    selected = (items[index] ?? items[index - 1] ?? parent)?.id;
    draw();
    (outline.querySelector<HTMLElement>('[aria-current]') ?? buttons.querySelector('button'))?.focus();
    notify('Element removed.');
  },
  undo: () => restore(undo, redo),
  redo: () => restore(redo, undo),
  phone: () => width(true),
  fit: () => width(false),
  top: canvas.scrollTop,
  'motion-start': () => { if (selected) canvas.motionStart(selected); },
  play: () => setPlaying(!playing),
  copy: () => {
    if (!navigator.clipboard) return selectPrompt();
    void navigator.clipboard.writeText(prompt.value).then(() => notify('Prompt copied.'), selectPrompt);
  },
};

function selectPrompt() {
  prompt.focus();
  prompt.select();
  notify('Prompt selected for copying.');
}

function step(direction: -1 | 1) {
  const origin = locate(current().blocks, selected);
  const neighbour = origin?.items[origin.index + direction];
  if (!origin || !neighbour || !selected) return;
  move(selected, { target: neighbour.id, position: direction === 1 ? 'after' : 'before' });
  const button = properties.querySelector<HTMLElement>(`[data-action="${direction === -1 ? 'up' : 'down'}"]:not(:disabled)`);
  (button ?? outline.querySelector<HTMLElement>('[aria-current]'))?.focus({ preventScroll: true });
}

function setPlaying(on: boolean) {
  playing = on;
  if (playing && displayMode() !== 'render') setMode('render');
  canvas.play(playing);
  const button = get('[data-action="play"]');
  button.setAttribute('aria-pressed', String(playing));
  button.textContent = playing ? 'Return to editing' : 'Play prototype';
}

function width(phone: boolean) {
  get('#stage').toggleAttribute('data-phone', phone);
  get('[data-action="phone"]').setAttribute('aria-pressed', String(phone));
  get('[data-action="fit"]').setAttribute('aria-pressed', String(!phone));
}

document.addEventListener('click', event => {
  const button = (event.target as Element).closest<HTMLButtonElement>('button[data-action]');
  if (button && Object.hasOwn(actions, button.dataset.action!)) actions[button.dataset.action!](button);
});
get('[role="tablist"]').addEventListener('keydown', event => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  const next = get('#compose').hidden ? 'compose' : 'workflow';
  workspace(next);
  get(`[data-action="${next}"]`).focus();
});

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
function showMotionStatus() {
  const supported = CSS.supports('animation-timeline: view()') && CSS.supports('animation-range: entry 0% entry 100%');
  get('#motion-status').textContent = reduced.matches || document.documentElement.dataset.motion === 'reduce'
    ? 'Showing static regions · reduced motion' : staticMotion ? 'Showing static regions · preview setting' : !supported ? 'Showing static regions · scroll timelines unavailable'
      : displayMode() === 'inspect' ? 'Showing static regions · Inspect mode' : 'Scroll inside the canvas to test motion';
}
document.documentElement.addEventListener('blueprint-display-mode', event => {
  const mode = (event as CustomEvent<Mode>).detail;
  if (mode !== 'render' && playing) setPlaying(false);
  canvas.mode(mode);
  showMotionStatus();
});
reduced.addEventListener('change', showMotionStatus);

scrubber.addEventListener('input', () => canvas.scrub(scrubber.valueAsNumber));
mountIcons(document);
draw();
renderWorkflow(true);
canvas.mode(displayMode());
showMotionStatus();
get('#studio').hidden = false;
get('[data-action="new"]').hidden = false;

const url = new URL(location.href);
const pattern = url.searchParams.get('section');
if (pattern && Object.hasOwn(patterns, pattern)) {
  url.searchParams.delete('section');
  history.replaceState(history.state, '', url);
  if (project.sheets.length < limit) {
    const layout = sheet(`${patterns[pattern as Pattern].label} study`, 'blank');
    layout.blocks.push(block(pattern as Pattern));
    commit(() => project.sheets.push(layout));
    open(layout);
  }
}
