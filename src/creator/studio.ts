import { closePreviewReference, displayMode, inspectPreview, setMode, type Mode } from '../inspect';
import { readPreferences, applyPreferences } from '../preferences';
import { specimenLink } from '../specimen-registry';
import { exampleHandoff, exampleProject } from './example';
import { actionDestination, briefFields, field, readBrief, selectField } from './forms';
import { iconMarkup, mountIcons, type Icon } from './icons';
import {
  activeDraft, defaultHandoff, defaultPhilosophy, draftLabel, emptyBrief, entry, goals, id, limit,
  philosophyFor, sectionTypes, slug, themes, tones, workflowReferences,
  type Artwork, type Draft, type Handoff, type Philosophy, type Project, type ReferenceId, type Section, type SectionKind, type Theme,
} from './model';
import { pageFiles, pageLink } from './pages';
import { makeSection, planDraft } from './planner';
import { createPreview, type CanvasEdit } from './preview';
import { escapeHtml as html, reviewPage } from './render-page';
import { createProjectStorage, isUsableDestination, readBackup } from './storage';
import { relationLabels, workflowPrompt } from './workflow';

applyPreferences(readPreferences());

function find<T extends HTMLElement = HTMLElement>(selector: string) {
  return document.querySelector<T>(selector)!;
}

const studio = find('#studio');
const outline = find('#outline-list');
const properties = find('#section-properties');
const frame = find<HTMLIFrameElement>('#page-preview');
const inspectButton = find<HTMLButtonElement>('[data-action="inspect-section"]');
const canvasButton = find<HTMLButtonElement>('[data-action="edit-canvas"]');
const previewHint = find('#preview-hint');
const feedback = find('#studio-feedback');

const briefDialog = find<HTMLDialogElement>('#brief-dialog');
const projectDialog = find<HTMLDialogElement>('#project-dialog');
const sectionDialog = find<HTMLDialogElement>('#section-dialog');
const exportDialog = find<HTMLDialogElement>('#export-dialog');
const importDialog = find<HTMLDialogElement>('#import-dialog');
const briefForm = find<HTMLFormElement>('#brief-form');
const importInput = find<HTMLInputElement>('#project-import');
const prompt = find<HTMLTextAreaElement>('#build-prompt');
const philosophyEditor = find('#philosophy-editor');
const handoffForm = find<HTMLFormElement>('#handoff-form');
const context = find<HTMLTextAreaElement>('#handoff-context');
const siteRoot = new URL('../', location.href).href;

const storage = createProjectStorage();
const initial = storage.read();
let project = initial.project ?? exampleProject();
let sectionId: string | undefined = activeDraft(project).sections[0]?.id;
let workspace: 'compose' | 'workflow' = 'compose';
let canvasEditing = false;
let briefPurpose: 'create' | 'settings' = 'create';
let replacingSection: string | undefined;
let comingFromLibrary: SectionKind | undefined;
let pendingBackup: Project | undefined;
let draggedSection: string | undefined;
let philosophyDraft: Philosophy | undefined;
let handoffDraft: Handoff | undefined;

const undo: Project[] = [];
const redo: Project[] = [];
const historyLimit = 60;
let editGroup: object | string | undefined;
let saveTimer: number | undefined;

function draft() {
  return activeDraft(project);
}

function section() {
  return draft().sections.find(section => section.id === sectionId);
}

function otherPages() {
  return project.drafts.filter(page => page.id !== draft().id);
}

function resolvedAction(page = draft(), files = pageFiles(project)) {
  return pageLink(page, files);
}

function syncCustomLink(form: ParentNode, target: string | undefined) {
  const custom = form.querySelector<HTMLElement>('[data-custom-link]');
  if (custom) custom.hidden = Boolean(target);
}

function status(message = '') {
  feedback.textContent = message;
}

function saveStatus(message: string) {
  const label = find('#save-status');
  label.textContent = message || 'Saved on this device';
  label.toggleAttribute('data-unavailable', Boolean(message));
}

function save(replace = false) {
  window.clearTimeout(saveTimer);
  saveTimer = undefined;
  saveStatus(storage.write(project, replace));
}

function remember(stack: Project[]) {
  stack.push(structuredClone(project));
  if (stack.length > historyLimit) stack.shift();
}

function beginEdit(group?: object | string) {
  if (group === undefined || group !== editGroup) {
    remember(undo);
    redo.length = 0;
  }
  editGroup = group;
}

function endEdit() {
  editGroup = undefined;
}

function updateHistoryButtons() {
  find<HTMLButtonElement>('[data-action="undo"]').disabled = undo.length === 0;
  find<HTMLButtonElement>('[data-action="redo"]').disabled = redo.length === 0;
}

function change(mutation: () => void, group?: object | string) {
  beginEdit(group);
  mutation();
  updateHistoryButtons();
  if (group === undefined) save();
  else {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(save, 220);
  }
}

function restore(from: Project[], to: Project[], message: string) {
  if (!from.length) return;
  remember(to);
  project = from.pop()!;
  endEdit();
  resetWorkflowDefaults();
  if (!section()) sectionId = draft().sections[0]?.id;
  renderEditor();
  save();
  status(message);
}

function resetWorkflowDefaults() {
  philosophyDraft = undefined;
  handoffDraft = undefined;
}

function previewMode(mode: Mode) {
  if (mode === 'inspect' && canvasEditing) setCanvasEditing(false);
  preview.setMode(mode);
  syncPreviewHint();
}

const preview = createPreview(frame, {
  onResize(width) { find('#viewport-width').textContent = `${width} px`; },
  onEdit(edit) { updateCanvas(edit); },
  onEditingEnd() { endEdit(); },
  onFocus(edit) { selectSection(edit.sectionId); },
  onInspect(id) {
    selectSection(id);
    inspectCurrent();
  },
  onExternalLink(href) {
    const targetId = draft().brief.targetId;
    if (targetId && resolvedAction() === href && project.drafts.some(page => page.id === targetId)) {
      project.activeId = targetId;
      endEdit();
      save();
      openActivePage('Opened the linked page.');
    } else {
      status('This link opens from the exported page. Project pages and page anchors work here.');
    }
  },
});

function setCanvasEditing(enabled: boolean) {
  if (enabled && displayMode() === 'inspect') setMode('render');
  canvasEditing = enabled;
  preview.setEditing(enabled);
  canvasButton.setAttribute('aria-pressed', String(enabled));
  syncPreviewHint();
}

function syncPreviewHint() {
  previewHint.textContent = canvasEditing
    ? 'Edit the outlined text. Action destinations are in Properties.'
    : displayMode() === 'inspect'
      ? 'Select a section to open its Reference Dock.'
      : 'Try links and disclosures in the preview.';
}

function inspectCurrent() {
  const current = section();
  const target = current && preview.node(current.id);
  if (!current || !target) return;
  const definition = sectionTypes[current.kind];
  const related = 'specimen' in definition
    ? { label: 'Open original Blueprint specimen', url: specimenLink(definition.specimen, siteRoot) }
    : undefined;
  const gridSelector = current.kind === 'hero' ? '.page-inner' : '.page-entries';
  const grid = target.querySelector<HTMLElement>(gridSelector) ?? undefined;
  inspectPreview(definition.reference, target, inspectButton, { related, grid });
}

function iconButton(action: string, icon: Icon, label: string, options: { item?: string; disabled?: boolean; remove?: boolean } = {}) {
  return `<button type="button" class="studio-icon-button${options.remove ? ' studio-delete' : ''}" data-action="${action}" aria-label="${label}" title="${label}"${options.item ? ` data-id="${options.item}"` : ''}${options.disabled ? ' disabled' : ''}>${iconMarkup(icon)}</button>`;
}

function selectSection(id: string, scroll = false) {
  const changing = sectionId !== id;
  if (changing) {
    closePreviewReference();
    sectionId = id;
    renderProperties();
    syncOutlineSelection();
  }
  preview.select(id, scroll);
}

function syncOutlineSelection() {
  for (const button of outline.querySelectorAll<HTMLButtonElement>('[data-action="select-section"]')) {
    if (button.dataset.id === sectionId) button.setAttribute('aria-current', 'true');
    else button.removeAttribute('aria-current');
  }
}

function renderOutline() {
  const sections = draft().sections;
  find('#section-count').textContent = `${sections.length} ${sections.length === 1 ? 'section' : 'sections'}`;
  find<HTMLButtonElement>('[data-action="add-section"]').disabled = sections.length >= limit.sections;
  outline.innerHTML = sections.map(section => {
    const definition = sectionTypes[section.kind];
    return `<li class="studio-outline-row" draggable="true" data-section-row="${section.id}">
      <button type="button" data-action="select-section" data-id="${section.id}">
        ${iconMarkup(definition.icon)}
        <span class="studio-row-text"><strong>${definition.label}</strong><small>${html(section.title || 'Untitled section')}</small></span>
        ${iconMarkup('chevron')}
      </button>
    </li>`;
  }).join('');
  syncOutlineSelection();
}

function entryMarkup(section: Section, row: Section['items'][number], index: number) {
  const faq = section.kind === 'faq';
  const type = faq ? 'question' : 'entry';
  return `<div class="studio-entry">
    <div class="studio-entry-head">
      <strong>${faq ? 'Question' : 'Entry'} ${index + 1}</strong>
      ${iconButton('remove-entry', 'trash', `Remove ${type} ${index + 1}`, { item: row.id, remove: true })}
    </div>
    ${field(faq ? 'Question' : 'Title', `item-title:${row.id}`, row.title, { max: 160 })}
    ${field(faq ? 'Answer' : 'Text', `item-body:${row.id}`, row.body, { rows: 2, max: 900 })}
  </div>`;
}

function renderProperties() {
  const current = section();
  inspectButton.disabled = !current;
  if (!current) {
    properties.innerHTML = '<p class="studio-empty">Add a section to start composing the page.</p>';
    return;
  }
  const page = draft();
  const definition = sectionTypes[current.kind];
  const position = page.sections.indexOf(current);
  const hasEntries = ['benefits', 'faq', 'steps'].includes(current.kind);
  const entryLabel = current.kind === 'faq' ? 'question' : 'entry';
  properties.innerHTML = `
    <div class="studio-property-title">
      ${iconMarkup(definition.icon)}<div><h3>${definition.label}</h3><p>${html(definition.description)}</p></div>
    </div>
    <div class="studio-section-actions" role="group" aria-label="Section actions">
      ${iconButton('move-up', 'up', 'Move section up', { disabled: position === 0 })}
      ${iconButton('move-down', 'down', 'Move section down', { disabled: position === page.sections.length - 1 })}
      ${iconButton('duplicate-section', 'copy', 'Duplicate section', { disabled: page.sections.length >= limit.sections })}
      ${iconButton('replace-section', 'swap', 'Replace section')}
      ${iconButton('remove-section', 'trash', 'Remove section', { remove: true })}
    </div>
    <div class="studio-reason">
      <strong>${current.reason ? 'Why this section' : 'Pattern'}</strong>
      <p>${html(current.reason || definition.description)}</p>
    </div>
    <div class="studio-fields">
      ${field('Section heading', 'title', current.title, { max: 160 })}
      ${field('Section label', 'eyebrow', current.eyebrow, { max: 80 })}
      ${field('Section copy', 'body', current.body, { rows: 3, max: 1800 })}
    </div>
    <label class="studio-check"><input type="checkbox" name="showAction"${current.showAction ? ' checked' : ''}> Place the page’s primary action here</label>
    ${current.showAction ? `<div class="studio-fields">
      ${field('Action label', 'action', page.brief.action, { max: 100 })}
      ${actionDestination(page.brief, otherPages())}
    </div>` : ''}
    ${hasEntries ? `<div class="studio-entry-list">
      <div class="studio-entry-head"><h4>${current.kind === 'faq' ? 'FAQ entries' : 'List entries'}</h4>
        <button type="button" class="studio-button" data-action="add-entry"${current.items.length >= limit.items ? ' disabled' : ''}>${iconMarkup('plus')} Add ${entryLabel}</button>
      </div>
      ${current.items.map((item, index) => entryMarkup(current, item, index)).join('')}
    </div>` : ''}`;
  if (current.showAction) syncDestinationFeedback(properties.querySelector<HTMLInputElement>('[name="href"]')!);
}

function syncOutlineTitle(current: Section) {
  const title = outline.querySelector(`[data-section-row="${current.id}"] small`);
  if (title) title.textContent = current.title || 'Untitled section';
}

function syncDestinationFeedback(input: HTMLInputElement) {
  const usable = isUsableDestination(input.value);
  if (usable) input.removeAttribute('aria-invalid');
  else input.setAttribute('aria-invalid', 'true');
  return usable;
}

function syncSectionField(current: Section, name: string, value: string) {
  const next = properties.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`);
  if (current.id === sectionId && next && next.value !== value) next.value = value;
}

function writeContent(current: Section, name: string, value: string) {
  if (name === 'title' || name === 'eyebrow' || name === 'body') current[name] = value;
  else if (name === 'action' || name === 'href') draft().brief[name] = value;
  else if (name.startsWith('item-')) {
    const [field, rowId] = name.split(':');
    const row = current.items.find(item => item.id === rowId);
    if (row) row[field === 'item-title' ? 'title' : 'body'] = value;
  }
}

function updateCanvas(edit: CanvasEdit) {
  const current = draft().sections.find(section => section.id === edit.sectionId);
  if (!current) return;
  const name = edit.itemId ? `${edit.field}:${edit.itemId}` : edit.field;
  change(() => writeContent(current, name, edit.text), `canvas:${current.id}:${name}`);
  syncSectionField(current, name, edit.text);
  if (edit.field === 'title') syncOutlineTitle(current);
  preview.mirrorAction(edit);
}

properties.addEventListener('input', event => {
  const field = event.target;
  const current = section();
  if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) || !current || !field.name) return;
  if (field.name === 'targetId') {
    change(() => { draft().brief.targetId = field.value || undefined; });
    syncCustomLink(properties, field.value);
    refreshPreview();
    return;
  }
  if (field.name === 'showAction') {
    change(() => { current.showAction = (field as HTMLInputElement).checked; });
    renderProperties();
    properties.querySelector<HTMLInputElement>('[name="showAction"]')?.focus({ preventScroll: true });
    refreshPreview(current.id);
    return;
  }
  change(() => writeContent(current, field.name, field.value), field);
  if (field.name === 'title') syncOutlineTitle(current);
  if (field.name === 'href' && field instanceof HTMLInputElement) syncDestinationFeedback(field);
  refreshPreview(['action', 'href'].includes(field.name) ? undefined : current.id);
});

function refreshPreview(onlySection?: string) {
  closePreviewReference();
  preview.render(draft(), { sectionId: onlySection, keepPosition: true, href: resolvedAction() });
}

function updateChrome() {
  const page = draft();
  const title = draftLabel(page);
  find('#current-page').textContent = title;
  find('#preview-name').textContent = pageFiles(project).get(page.id)!;
  const source = page.origin && project.drafts.find(item => item.id === page.origin!.draftId);
  const originButton = find<HTMLButtonElement>('#page-origin');
  originButton.hidden = !source || !page.origin;
  if (source && page.origin) {
    originButton.dataset.id = source.id;
    originButton.textContent = `${relationLabels[page.origin.relation]} · Back to ${draftLabel(source)}`;
  }
  updateHistoryButtons();
}

function renderEditor(keepPosition = false) {
  closePreviewReference();
  updateChrome();
  renderOutline();
  renderProperties();
  preview.select(sectionId);
  preview.render(draft(), { keepPosition, href: resolvedAction() });
  if (workspace === 'workflow') renderWorkflow();
}

function setWorkspace(next: 'compose' | 'workflow') {
  if (workspace === next) return;
  closePreviewReference();
  workspace = next;
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-workspace]')) {
    const active = button.dataset.workspace === next;
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
    find(`#${button.dataset.workspace}`).hidden = !active;
  }
  if (next === 'workflow') renderWorkflow();
}

find('.studio-workspaces').addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const next = event.key === 'Home' ? 'compose' : event.key === 'End' ? 'workflow' : workspace === 'compose' ? 'workflow' : 'compose';
  setWorkspace(next);
  find(`#tab-${next}`).focus();
});

function currentPhilosophy() {
  return philosophyFor(project, draft()) ?? (philosophyDraft ??= defaultPhilosophy(draft()));
}

function currentHandoff() {
  return project.handoffs[draft().id] ?? (handoffDraft ??= defaultHandoff(draft()));
}

const actionPolicies = { single: 'One primary action placement', repeat: 'Repeat the action where it helps' } as const;

function ruleMarkup(rule: Philosophy['rules'][number], index: number) {
  return `<div class="workflow-rule">
    ${field(`Decision ${index + 1}`, `rule:${rule.id}`, rule.text, { rows: 2, max: 500 })}
    <div class="workflow-rule-kind">
      <label><span class="studio-visually-hidden">Decision ${index + 1} inheritance</span>
        <select name="require:${rule.id}">
          <option value="required"${rule.required ? ' selected' : ''}>Inherited requirement</option>
          <option value="guidance"${rule.required ? '' : ' selected'}>Adaptable guidance</option>
        </select>
      </label>
      ${iconButton('remove-rule', 'trash', `Remove decision ${index + 1}`, { item: rule.id, remove: true })}
    </div>
  </div>`;
}

function renderPhilosophy() {
  const philosophy = currentPhilosophy();
  const count = project.drafts.filter(item => item.philosophyId === philosophy.id).length;
  philosophyEditor.innerHTML = `
    ${count > 1 ? `<p>Shared by ${count} pages. New drafts use the latest decisions.</p>` : ''}
    ${field('Philosophy name', 'name', philosophy.name, { max: 120 })}
    ${field('Desired experience', 'experience', philosophy.experience, { rows: 3, max: 1400, placeholder: 'How should someone feel and what should they be able to do?' })}
    ${selectField('Tone', 'tone', philosophy.tone, tones)}
    ${selectField('Shared palette', 'theme', philosophy.theme, themes)}
    ${selectField('Primary action convention', 'actionPolicy', philosophy.actionPolicy, actionPolicies)}
    <div class="studio-entry-list">
      <div class="studio-entry-head"><h4>UX decisions</h4>
        <button type="button" class="studio-button" data-action="add-rule"${philosophy.rules.length >= limit.rules ? ' disabled' : ''}>${iconMarkup('plus')} Add decision</button>
      </div>
      ${philosophy.rules.map(ruleMarkup).join('')}
    </div>
    <fieldset class="workflow-reference-list"><legend>Blueprint references</legend>
      ${Object.entries(workflowReferences).map(([key, label]) => `<label class="studio-check"><input type="checkbox" name="reference:${key}"${philosophy.references.includes(key as ReferenceId) ? ' checked' : ''}> ${label}</label>`).join('')}
    </fieldset>`;
}

function renderWorkflow() {
  renderPhilosophy();
  const handoff = currentHandoff();
  find('#handoff-fields').innerHTML = briefFields(handoff.brief, true, project.drafts);
  (handoffForm.elements.namedItem('link-source') as HTMLInputElement).checked = handoff.linkSource ?? true;
  for (const input of handoffForm.querySelectorAll<HTMLInputElement>('[name="relation"]')) {
    input.checked = input.value === handoff.relation;
  }
  context.value = handoff.context;
  renderPrompt();
}

function renderPrompt() {
  const source = draft();
  const handoff = currentHandoff();
  const target = handoff.brief;
  const complement = handoff.relation === 'complement';
  find('#journey-source').textContent = draftLabel(source);
  find('#journey-source-action').textContent = source.brief.action || goals[source.brief.goal];
  find('#journey-relation').textContent = complement ? 'Next step' : 'Sibling page';
  find('#journey-target').textContent = target.name || 'Next page';
  find('#journey-target-action').textContent = target.action || 'Define the primary action';
  find('#handoff-context-label').textContent = complement ? 'Arrival and what the visitor needs next' : 'Connection to the source';
  context.placeholder = complement ? 'e.g. They just signed up and need to create a first project.' : 'e.g. A product page for the same design toolkit.';
  context.required = complement;
  find('[data-action="sample-handoff"]').hidden = source.brief.name !== 'Forma' || source.artwork !== 'forma'
    || Boolean(source.brief.targetId || target.name || target.promise || target.action || handoff.context);
  find('#link-handoff').hidden = !complement || !source.sections.some(section => section.showAction);
  const linkedPage = target.targetId && project.drafts.find(page => page.id === target.targetId);
  const nextPrompt = workflowPrompt(source, currentPhilosophy(), handoff, key => specimenLink(key, siteRoot),
    linkedPage ? draftLabel(linkedPage) : undefined);
  if (prompt.value !== nextPrompt) {
    const scrollPosition = prompt.scrollTop;
    prompt.value = nextPrompt;
    prompt.scrollTop = scrollPosition;
  }
}

function attachPhilosophy(philosophy: Philosophy, page: Draft) {
  if (page.philosophyId) return;
  project.philosophies.push(philosophy);
  page.philosophyId = philosophy.id;
}

function editPhilosophy(mutation: (philosophy: Philosophy) => void, group?: object) {
  const philosophy = currentPhilosophy();
  change(() => {
    attachPhilosophy(philosophy, draft());
    mutation(philosophy);
  }, group);
  renderPrompt();
}

philosophyEditor.addEventListener('input', event => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement || input instanceof HTMLSelectElement || input instanceof HTMLTextAreaElement)) return;
  const [key, item] = input.name.split(':');
  const value = input.value;
  editPhilosophy(philosophy => {
    if (key === 'name' || key === 'experience') philosophy[key] = value;
    else if (key === 'tone' && Object.hasOwn(tones, value)) philosophy.tone = value as Philosophy['tone'];
    else if (key === 'theme' && Object.hasOwn(themes, value)) philosophy.theme = value as Theme;
    else if (key === 'actionPolicy' && Object.hasOwn(actionPolicies, value)) philosophy.actionPolicy = value as Philosophy['actionPolicy'];
    else if (key === 'reference' && Object.hasOwn(workflowReferences, item) && input instanceof HTMLInputElement) {
      const reference = item as ReferenceId;
      const others = philosophy.references.filter(ref => ref !== reference);
      philosophy.references = input.checked ? [...others, reference] : others;
    } else {
      const rule = philosophy.rules.find(rule => rule.id === item);
      if (rule && key === 'rule') rule.text = value;
      if (rule && key === 'require') rule.required = value === 'required';
    }
  }, input);
});

handoffForm.addEventListener('input', event => {
  const input = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  input.setCustomValidity('');
  const next = readHandoff();
  if (input.name === 'targetId') {
    syncCustomLink(handoffForm, next.brief.targetId);
    (handoffForm.elements.namedItem('href') as HTMLInputElement).setCustomValidity('');
  }
  if (input.name === 'relation') context.setCustomValidity('');
  const prev = currentHandoff();
  if (input.name === 'relation' && !prev.brief.name && !prev.brief.action && !prev.brief.promise && prev.brief.goal === (prev.relation === 'complement' ? 'onboard' : 'educate')) {
    next.brief.goal = next.relation === 'complement' ? 'onboard' : 'educate';
    (handoffForm.elements.namedItem('goal') as HTMLSelectElement).value = next.brief.goal;
  }
  change(() => { project.handoffs[draft().id] = next; }, input);
  renderPrompt();
});

function readHandoff(): Handoff {
  const form = new FormData(handoffForm);
  return {
    brief: readBrief(form),
    relation: form.get('relation') === 'complement' ? 'complement' : 'sibling',
    context: String(form.get('context') || ''),
    linkSource: form.has('link-source'),
  };
}

function validateBrief(form: HTMLFormElement, brief: Handoff['brief']) {
  const name = form.elements.namedItem('name') as HTMLInputElement;
  const href = form.elements.namedItem('href') as HTMLInputElement;
  name.setCustomValidity(brief.name.trim() ? '' : 'Enter a page name.');
  href.setCustomValidity(brief.targetId || isUsableDestination(brief.href) ? '' : 'Use a web URL, mailto: or tel: link, local path, or #section.');
  return form.reportValidity();
}

handoffForm.addEventListener('submit', event => {
  event.preventDefault();
  const handoff = readHandoff();
  if (handoff.relation === 'complement' && !handoff.context.trim()) {
    context.setCustomValidity('Describe how the visitor arrives and what they need next.');
  }
  if (!validateBrief(handoffForm, handoff.brief)) return;
  if (project.drafts.length >= limit.drafts) {
    status('This project is full. Download a backup and remove a page to add another.');
    return;
  }
  handoff.brief.name = handoff.brief.name.trim();
  const source = draft();
  const philosophy = currentPhilosophy();
  const related = planDraft(handoff.brief, philosophy, { source, handoff });
  change(() => {
    attachPhilosophy(philosophy, source);
    project.handoffs[source.id] = handoff;
    if (handoff.relation === 'complement' && handoff.linkSource && source.sections.some(section => section.showAction)) {
      source.brief.targetId = related.id;
    }
    project.drafts.push(related);
    project.activeId = related.id;
  });
  openActivePage(`${draftLabel(related)} created from ${philosophy.name || 'the shared philosophy'}.`);
});

function openActivePage(message = '', focus = true) {
  sectionId = draft().sections[0]?.id;
  resetWorkflowDefaults();
  setCanvasEditing(false);
  setWorkspace('compose');
  renderEditor();
  if (focus) find('[data-action="project"]').focus({ preventScroll: true });
  status(message);
}

function showProject() {
  find('#import-status').textContent = '';
  find('#project-pages').innerHTML = project.drafts.map(page => {
    const source = page.origin && project.drafts.find(item => item.id === page.origin!.draftId);
    const line = source ? `From ${draftLabel(source)} · ${goals[page.brief.goal]}` : goals[page.brief.goal];
    return `<li class="studio-project-row">
      <button type="button" data-action="open-page" data-id="${page.id}"${page.id === project.activeId ? ' aria-current="true" autofocus' : ''}>
        ${iconMarkup(page.origin ? 'branch' : 'page')}
        <span class="studio-row-text"><strong>${html(draftLabel(page))}</strong><small>${html(line)}</small></span>
        ${iconMarkup('chevron')}
      </button>
      ${iconButton('delete-page', 'trash', `Remove page ${html(draftLabel(page))}`, { item: page.id, remove: true, disabled: project.drafts.length <= 1 })}
    </li>`;
  }).join('');
  if (!projectDialog.open) projectDialog.showModal();
}

function removePage(id: string) {
  if (project.drafts.length <= 1) return;
  const removed = project.drafts.find(item => item.id === id);
  if (!removed) return;
  const isActive = removed.id === project.activeId;
  change(() => {
    project.drafts = project.drafts.filter(item => item.id !== id);
    delete project.handoffs[id];
    for (const page of project.drafts) {
      if (page.origin?.draftId === id) page.origin = null;
      if (page.brief.targetId === id) delete page.brief.targetId;
    }
    for (const handoff of Object.values(project.handoffs)) {
      if (handoff.brief.targetId === id) delete handoff.brief.targetId;
    }
    project.philosophies = project.philosophies.filter(philosophy =>
      project.drafts.some(page => page.philosophyId === philosophy.id));
    if (isActive) project.activeId = project.drafts[0].id;
  });
  if (isActive) openActivePage('', false);
  else renderEditor(true);
  showProject();
  find('#project-pages [aria-current]').focus();
  find('#import-status').textContent = `${draftLabel(removed)} removed. You can undo this change.`;
}

function showBrief(purpose: typeof briefPurpose) {
  if (purpose === 'create' && project.drafts.length >= limit.drafts) {
    status('This project is full. Remove a page to add another.');
    if (projectDialog.open) find('#import-status').textContent = feedback.textContent;
    return;
  }
  if (projectDialog.open) projectDialog.close();
  briefPurpose = purpose;
  const creating = purpose === 'create';
  const page = draft();
  const fromPattern = creating && comingFromLibrary ? sectionTypes[comingFromLibrary].label : '';
  find('#brief-title').textContent = fromPattern ? `Start with ${fromPattern}` : creating ? 'New page' : 'Page settings';
  find('#brief-fields').innerHTML = briefFields(creating ? emptyBrief() : page.brief, creating, creating ? project.drafts : otherPages());
  find('#brief-submit').lastChild!.textContent = creating ? 'Build draft' : 'Save settings';
  find('[data-action="blank-page"]').hidden = !creating;
  find('[data-action="blank-page"]').textContent = fromPattern ? 'Use this section' : 'Start with an empty page';
  find('#page-appearance').hidden = creating;
  find('#page-palettes').innerHTML = creating ? '' : Object.entries(themes).map(([theme, name]) =>
    `<label><input type="radio" name="theme" value="${theme}"${page.theme === theme ? ' checked' : ''}><span class="studio-swatches" data-theme="${theme}" aria-hidden="true"></span>${name}</label>`).join('');
  find('#page-artwork').innerHTML = creating ? '' : selectField('Hero artwork', 'artwork', page.artwork, {
    forma: 'Forma photograph', pattern: 'Geometric pattern', none: 'Text only',
  });
  briefDialog.showModal();
  (briefForm.elements.namedItem('name') as HTMLInputElement).focus();
}

briefForm.addEventListener('input', event => {
  const input = event.target;
  if (input instanceof HTMLInputElement) input.setCustomValidity('');
  if (input instanceof HTMLSelectElement && input.name === 'targetId') {
    syncCustomLink(briefForm, input.value);
    (briefForm.elements.namedItem('href') as HTMLInputElement).setCustomValidity('');
  }
});

function submitBrief(blank: boolean) {
  const form = new FormData(briefForm);
  const brief = readBrief(form);
  if (!validateBrief(briefForm, brief)) return;
  brief.name = brief.name.trim();
  if (briefPurpose === 'settings') {
    const page = draft();
    change(() => {
      page.brief = brief;
      page.theme = String(form.get('theme')) as Theme;
      page.artwork = String(form.get('artwork')) as Artwork;
    });
    briefDialog.close();
    resetWorkflowDefaults();
    renderEditor(true);
    status('Page settings saved.');
    return;
  }

  const page = planDraft(brief);
  if (blank) page.sections = [];
  if (comingFromLibrary && !page.sections.some(section => section.kind === comingFromLibrary)) {
    const pattern = makeSection(comingFromLibrary, brief, page.tone);
    if (blank) page.sections.push(pattern);
    else page.sections.splice(Math.max(1, page.sections.length - 1), 0, pattern);
  }
  const librarySection = comingFromLibrary;
  comingFromLibrary = undefined;
  change(() => {
    project.drafts.push(page);
    project.activeId = page.id;
  });
  briefDialog.close();
  openActivePage(blank && !librarySection ? 'Empty page created.' : 'Draft ready. Explore the outline to see why each section was chosen.');
  const selected = librarySection && page.sections.find(section => section.kind === librarySection);
  if (selected) selectSection(selected.id, true);
}

briefForm.addEventListener('submit', event => {
  event.preventDefault();
  submitBrief(false);
});

briefDialog.addEventListener('close', () => { comingFromLibrary = undefined; });

function showCatalog(replace: boolean) {
  replacingSection = replace ? sectionId : undefined;
  find('#section-dialog-title').textContent = replace ? 'Replace section' : 'Add a section';
  find('#section-catalog').innerHTML = (Object.entries(sectionTypes) as [SectionKind, (typeof sectionTypes)[SectionKind]][]).map(([kind, definition]) =>
    `<button type="button" class="studio-button" data-action="choose-section" data-id="${kind}">
      ${iconMarkup(definition.icon)}<strong>${definition.label}</strong><small>${html(definition.description)}</small>
    </button>`).join('');
  sectionDialog.showModal();
}

function commitSections(sections: Section[], selected: string | undefined, message: string, focus?: string) {
  change(() => { draft().sections = sections; });
  sectionId = selected;
  renderEditor(true);
  preview.select(sectionId, true);
  status(message);
  const target = focus && properties.querySelector<HTMLButtonElement>(`[data-action="${focus}"]:not(:disabled)`);
  const outlineButton = sectionId && outline.querySelector<HTMLButtonElement>(`[data-id="${sectionId}"]`);
  (target || outlineButton || find('[data-action="add-section"]')).focus({ preventScroll: true });
}

function chooseSection(kind: SectionKind) {
  const page = draft();
  const next = makeSection(kind, page.brief, page.tone);
  const index = page.sections.findIndex(item => item.id === (replacingSection || sectionId));
  const sections = [...page.sections];
  if (replacingSection && index >= 0) sections.splice(index, 1, next);
  else sections.splice(index >= 0 ? index + 1 : sections.length, 0, next);
  sectionDialog.close();
  commitSections(sections, next.id, `${sectionTypes[kind].label} ${replacingSection ? 'replaced the selected section' : 'added'}.`);
  replacingSection = undefined;
}

function moveSection(from: string, to: string, after = false, focus?: string) {
  if (from === to) return;
  const sections = [...draft().sections];
  const oldIndex = sections.findIndex(item => item.id === from);
  if (oldIndex < 0) return;
  const [moved] = sections.splice(oldIndex, 1);
  const index = sections.findIndex(item => item.id === to);
  if (index < 0) return;
  const newIndex = index + Number(after);
  if (newIndex === oldIndex) return;
  sections.splice(newIndex, 0, moved);
  commitSections(sections, moved.id, `${sectionTypes[moved.kind].label} moved to position ${newIndex + 1}.`, focus);
}

function moveCurrent(direction: -1 | 1) {
  const current = section();
  if (!current) return;
  const sections = draft().sections;
  const neighbour = sections[sections.indexOf(current) + direction];
  if (neighbour) moveSection(current.id, neighbour.id, direction === 1, direction === 1 ? 'move-down' : 'move-up');
}

function duplicateSection() {
  const current = section();
  if (!current) return;
  const next = { ...current, id: id(), items: current.items.map(item => entry(item.title, item.body)) };
  const sections = [...draft().sections];
  sections.splice(sections.indexOf(current) + 1, 0, next);
  commitSections(sections, next.id, 'Section duplicated.', 'duplicate-section');
}

function removeSection() {
  const current = section();
  if (!current) return;
  const sections = [...draft().sections];
  const index = sections.indexOf(current);
  sections.splice(index, 1);
  commitSections(sections, (sections[index] ?? sections[index - 1])?.id, 'Section removed. You can undo this change.');
}

function changeEntries(removeId?: string) {
  const current = section();
  if (!current) return;
  const added = removeId ? undefined : entry();
  change(() => {
    current.items = added ? [...current.items, added] : current.items.filter(item => item.id !== removeId);
  });
  renderProperties();
  refreshPreview(current.id);
  if (added) properties.querySelector<HTMLElement>(`[name="item-title:${added.id}"]`)?.focus();
  else properties.querySelector<HTMLElement>('[data-action="add-entry"]')?.focus({ preventScroll: true });
  status(added ? 'Entry added.' : 'Entry removed.');
}

function changeRules(removeId?: string) {
  const added = removeId ? undefined : { id: id(), text: '', required: true };
  editPhilosophy(philosophy => {
    philosophy.rules = added ? [...philosophy.rules, added] : philosophy.rules.filter(rule => rule.id !== removeId);
  });
  renderPhilosophy();
  if (added) philosophyEditor.querySelector<HTMLElement>(`[name="rule:${added.id}"]`)?.focus();
  else philosophyEditor.querySelector<HTMLElement>('[data-action="add-rule"]')?.focus();
}

function clearDropIndicator() {
  outline.querySelector('.is-drop-before, .is-drop-after')?.classList.remove('is-drop-before', 'is-drop-after');
}

outline.addEventListener('dragstart', event => {
  const row = (event.target as Element).closest<HTMLElement>('[data-section-row]');
  if (!row || !event.dataTransfer) return;
  draggedSection = row.dataset.sectionRow;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', draggedSection!);
});
outline.addEventListener('dragover', event => {
  clearDropIndicator();
  const row = (event.target as Element).closest<HTMLElement>('[data-section-row]');
  if (!row || !draggedSection || row.dataset.sectionRow === draggedSection) return;
  event.preventDefault();
  const box = row.getBoundingClientRect();
  row.classList.add(event.clientY > box.top + box.height / 2 ? 'is-drop-after' : 'is-drop-before');
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
});
outline.addEventListener('dragleave', event => {
  if (!outline.contains(event.relatedTarget as Node | null)) clearDropIndicator();
});
outline.addEventListener('drop', event => {
  const row = (event.target as Element).closest<HTMLElement>('[data-section-row]');
  if (draggedSection && row?.dataset.sectionRow) {
    event.preventDefault();
    moveSection(draggedSection, row.dataset.sectionRow, row.classList.contains('is-drop-after'));
  }
  draggedSection = undefined;
  clearDropIndicator();
});
outline.addEventListener('dragend', () => {
  draggedSection = undefined;
  clearDropIndicator();
});

function showExport() {
  const page = draft();
  const issues = reviewPage(page, resolvedAction());
  const bundle = page.brief.targetId ? '<p>Keep project links working by downloading the linked site and extracting it into one folder.</p>' : '';
  find('#export-review').innerHTML = issues.length
    ? `<strong>Before you publish</strong><ul>${issues.map(issue => `<li>${html(issue)}</li>`).join('')}</ul>${bundle}`
    : `<strong>Ready to preview outside Blueprint</strong><p>Your HTML includes the page design and native interactions.</p>${bundle}`;
  find<HTMLButtonElement>('[data-action="download-site"]').hidden = project.drafts.length < 2;
  find('#export-status').textContent = '';
  exportDialog.showModal();
}

function download(name: string, type: string, content: BlobPart) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function downloadBackup() {
  download('blueprint-project.json', 'application/json', JSON.stringify(project));
  status('Project backup downloaded.');
  if (exportDialog.open) find('#export-status').textContent = 'Project backup downloaded.';
}

async function copyPrompt() {
  try {
    await navigator.clipboard.writeText(prompt.value);
    const button = find<HTMLButtonElement>('[data-action="copy-prompt"]');
    button.replaceChildren('Prompt copied');
    window.setTimeout(() => button.replaceChildren(iconFragment('copy'), 'Copy prompt'), 1800);
    status('Build prompt copied.');
  } catch {
    prompt.focus();
    prompt.select();
    status('Prompt selected. Use your device’s Copy command.');
  }
}

function iconFragment(icon: Icon) {
  const template = document.createElement('template');
  template.innerHTML = iconMarkup(icon);
  return template.content;
}

let importAttempt = 0;
importInput.addEventListener('change', async () => {
  const file = importInput.files?.[0];
  importInput.value = '';
  if (!file) return;
  const attempt = ++importAttempt;
  try {
    const backup = await readBackup(file);
    if (attempt !== importAttempt || !projectDialog.open) return;
    pendingBackup = backup;
    find('#import-count').textContent = `${backup.drafts.length} ${backup.drafts.length === 1 ? 'page' : 'pages'}`;
    importDialog.returnValue = '';
    importDialog.showModal();
  } catch (error) {
    if (attempt !== importAttempt) return;
    find('#import-status').textContent = error instanceof Error && !(error instanceof SyntaxError) ? error.message : 'Choose a valid Blueprint Studio JSON backup.';
  }
});
importDialog.addEventListener('close', () => {
  if (importDialog.returnValue === 'replace' && pendingBackup) {
    remember(undo);
    redo.length = 0;
    project = pendingBackup;
    endEdit();
    projectDialog.close();
    save(true);
    openActivePage('Project backup restored.');
  }
  pendingBackup = undefined;
});

async function exportHtml() {
  const button = find<HTMLButtonElement>('[data-action="download-html"]');
  const feedback = find('#export-status');
  const page = draft();
  const files = pageFiles(project);
  const href = resolvedAction(page, files);
  button.disabled = true;
  feedback.textContent = 'Preparing page…';
  try {
    const { htmlDownload } = await import('./export-page');
    download(files.get(page.id)!, 'text/html', htmlDownload(page, href));
    feedback.textContent = 'Page HTML downloaded.';
  } catch {
    feedback.textContent = 'The page could not be exported. Try again when the Studio is connected.';
  } finally {
    button.disabled = false;
  }
}

async function exportSite() {
  const button = find<HTMLButtonElement>('[data-action="download-site"]');
  const feedback = find('#export-status');
  button.disabled = true;
  feedback.textContent = 'Preparing site…';
  try {
    const { downloadSite } = await import('./export-site');
    const archive = downloadSite(project);
    download('blueprint-site.zip', 'application/zip', archive);
    feedback.textContent = 'Site downloaded. Extract it and open start-here.html.';
  } catch {
    feedback.textContent = 'The site could not be exported. Try downloading an individual page.';
  } finally {
    button.disabled = false;
  }
}

const actions: Record<string, (button: HTMLButtonElement) => void> = {
  undo: () => restore(undo, redo, 'Change undone.'),
  redo: () => restore(redo, undo, 'Change redone.'),
  project: showProject,
  'open-page': button => {
    if (!project.drafts.some(page => page.id === button.dataset.id)) return;
    project.activeId = button.dataset.id!;
    endEdit();
    if (projectDialog.open) projectDialog.close();
    save();
    openActivePage();
  },
  'delete-page': button => removePage(button.dataset.id!),
  'new-page': () => showBrief('create'),
  'page-settings': () => showBrief('settings'),
  'blank-page': () => submitBrief(true),
  'select-section': button => selectSection(button.dataset.id!, true),
  'inspect-section': inspectCurrent,
  'edit-canvas': () => setCanvasEditing(!canvasEditing),
  'add-section': () => showCatalog(false),
  'replace-section': () => showCatalog(true),
  'choose-section': button => chooseSection(button.dataset.id as SectionKind),
  'move-up': () => moveCurrent(-1),
  'move-down': () => moveCurrent(1),
  'duplicate-section': duplicateSection,
  'remove-section': removeSection,
  'add-entry': () => changeEntries(),
  'remove-entry': button => changeEntries(button.dataset.id),
  'add-rule': () => changeRules(),
  'remove-rule': button => changeRules(button.dataset.id),
  'sample-handoff': () => {
    change(() => { project.handoffs[draft().id] = exampleHandoff(); });
    renderWorkflow();
    (handoffForm.elements.namedItem('name') as HTMLInputElement).focus();
    status('Sample handoff loaded.');
  },
  'copy-prompt': () => { void copyPrompt(); },
  'download-prompt': () => {
    download(`${slug(currentHandoff().brief.name)}-build-prompt.md`, 'text/markdown', prompt.value);
    status('Build prompt downloaded.');
  },
  export: showExport,
  'download-html': () => { void exportHtml(); },
  'download-site': () => { void exportSite(); },
  'download-backup': downloadBackup,
  import: () => importInput.click(),
};

document.addEventListener('click', event => {
  const button = (event.target as Element).closest<HTMLButtonElement>('button');
  if (!button || button.disabled) return;
  const { action, width, workspace } = button.dataset;
  if (action && Object.hasOwn(actions, action)) actions[action](button);
  if (workspace === 'compose' || workspace === 'workflow') setWorkspace(workspace);
  if (width === 'fit' || width === 'phone') {
    find('#stage').dataset.width = width;
    for (const button of document.querySelectorAll<HTMLButtonElement>('[data-width][aria-pressed]')) {
      button.setAttribute('aria-pressed', String(button.dataset.width === width));
    }
  }
});

find<HTMLAnchorElement>('.workflow-links a[href="#prompt-title"]').addEventListener('click', event => {
  event.preventDefault();
  prompt.focus();
});

document.addEventListener('focusout', endEdit);
document.addEventListener('keydown', event => {
  if (event.defaultPrevented || event.altKey || !(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return;
  const target = event.target as HTMLElement;
  if (target.closest('input, select, textarea, [contenteditable], dialog')) return;
  event.preventDefault();
  if (event.shiftKey) restore(redo, undo, 'Change redone.');
  else restore(undo, redo, 'Change undone.');
});
document.documentElement.addEventListener('blueprint-display-mode', (event: Event) => previewMode((event as CustomEvent<Mode>).detail));
window.addEventListener('pagehide', () => { if (saveTimer !== undefined) save(); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && saveTimer !== undefined) save();
});
storage.listen(saveStatus);

mountIcons(document);
renderEditor();
previewMode(displayMode());
if (initial.message) saveStatus(initial.message);
else save();
studio.hidden = false;
document.querySelectorAll<HTMLElement>('[data-studio-required]').forEach(element => { element.hidden = false; });

const startWith = new URL(location.href);
const pattern = startWith.searchParams.get('section');
if (pattern && Object.hasOwn(sectionTypes, pattern)) {
  startWith.searchParams.delete('section');
  history.replaceState(history.state, '', startWith);
  comingFromLibrary = pattern as SectionKind;
  showBrief('create');
}
