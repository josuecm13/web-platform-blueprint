import artwork from './assets/forma.webp?url';
import serif from './assets/instrument-serif-latin.woff2?url';
import sans from './assets/inter-latin.woff2?url';
import { type Mode } from '../inspect';
import { type Draft } from './model';
import { pageBody, previewDocument, renderPageSection } from './render-page';

// srcdoc uses the parent's base URL, but making asset addresses explicit also
// keeps the preview working on project sites hosted under a path.
const absolute = (path: string) => new URL(path, location.href).href;
const pageFonts = `@font-face { font-family: "Instrument Serif"; src: url("${absolute(serif)}") format("woff2"); font-display: swap; }
@font-face { font-family: Inter; src: url("${absolute(sans)}") format("woff2"); font-weight: 400 750; font-display: swap; }`;

export type CanvasField = 'title' | 'eyebrow' | 'body' | 'action' | 'item-title' | 'item-body';
export type CanvasEdit = { sectionId: string; itemId?: string; field: CanvasField; text: string };

const multiline = new Set<CanvasField>(['body', 'item-body']);
const canvasFields = new Set<string>(['title', 'eyebrow', 'body', 'action', 'item-title', 'item-body']);

export function canvasText(value: string, field: CanvasField) {
  const limit = { title: 160, eyebrow: 80, body: 1800, action: 100, 'item-title': 160, 'item-body': 900 };
  const text = value.replaceAll('\r', '');
  return (multiline.has(field) ? text : text.replace(/[\n\t]+/g, ' ')).slice(0, limit[field]);
}

export function createPreview(frame: HTMLIFrameElement, handlers: {
  onEdit(edit: CanvasEdit): void;
  onEditingEnd(edit: CanvasEdit): void;
  onFocus(edit: CanvasEdit): void;
  onInspect(sectionId: string): void;
  onExternalLink(href: string): void;
  onResize(width: number): void;
}) {
  let draft: Draft | undefined;
  let selected: string | undefined;
  let href = '';
  let mode: Mode = 'render';
  let editing = false;
  let inner: Document | undefined;

  function applyCanvasEdit(scope: ParentNode) {
    for (const element of scope.querySelectorAll<HTMLElement>('[data-edit]')) {
      if (editing) {
        element.setAttribute('contenteditable', 'plaintext-only');
        if (!element.isContentEditable) element.setAttribute('contenteditable', 'true');
        element.setAttribute('role', 'textbox');
        element.setAttribute('aria-label', element.dataset.editLabel ?? 'Editable text');
        if (multiline.has(element.dataset.edit as CanvasField)) element.setAttribute('aria-multiline', 'true');
      } else {
        for (const attribute of ['contenteditable', 'role', 'aria-label', 'aria-multiline']) {
          element.removeAttribute(attribute);
        }
      }
    }
  }

  function select(sectionId?: string, scroll = false) {
    selected = sectionId;
    if (!inner) return;
    for (const section of inner.querySelectorAll<HTMLElement>('[data-section]')) {
      section.toggleAttribute('data-current', section.dataset.section === sectionId);
    }
    if (scroll && sectionId) node(sectionId)?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }

  function node(sectionId: string) {
    return inner?.querySelector<HTMLElement>(`[data-section="${sectionId}"]`);
  }

  function openEntries(scope: ParentNode) {
    return new Set([...scope.querySelectorAll<HTMLElement>('details[open][data-entry]')].map(element => element.dataset.entry));
  }

  function restoreEntries(scope: ParentNode, open: Set<string | undefined>) {
    for (const details of scope.querySelectorAll<HTMLDetailsElement>('details[data-entry]')) {
      if (open.has(details.dataset.entry)) details.open = true;
    }
  }

  function render(next: Draft, options: { sectionId?: string; keepPosition?: boolean; href?: string } = {}) {
    draft = next;
    if (options.href !== undefined) href = options.href;
    if (!inner) return;
    inner.documentElement.dataset.theme = next.theme;
    const section = options.sectionId && next.sections.find(item => item.id === options.sectionId);
    const current = section && node(section.id);
    if (current && section) {
      const open = openEntries(current);
      const content = inner.createElement('template');
      content.innerHTML = renderPageSection(next, section, true, absolute(artwork), href);
      current.replaceWith(content.content);
      const updated = node(section.id)!;
      restoreEntries(updated, open);
      applyCanvasEdit(updated);
    } else {
      const open = options.keepPosition ? openEntries(inner) : new Set<string>();
      const top = options.keepPosition ? inner.scrollingElement?.scrollTop ?? 0 : 0;
      inner.body.innerHTML = pageBody(next, true, absolute(artwork), href);
      restoreEntries(inner, open);
      applyCanvasEdit(inner);
      inner.defaultView?.scrollTo(0, top);
    }
    select(selected);
  }

  function editFor(element: Element | null): CanvasEdit | undefined {
    const target = element?.closest<HTMLElement>('[data-edit]');
    const sectionId = target?.closest<HTMLElement>('[data-section]')?.dataset.section;
    const field = target?.dataset.edit;
    if (!editing || !sectionId || !target || !field || !canvasFields.has(field)) return;
    const typedField = field as CanvasField;
    return { sectionId, itemId: target.dataset.item, field: typedField, text: canvasText(target.innerText, typedField) };
  }

  function rootInit() {
    const document = frame.contentDocument;
    if (!document?.documentElement.hasAttribute('data-studio-preview')) return;
    inner = document;
    inner.documentElement.dataset.mode = mode;
    inner.documentElement.toggleAttribute('data-editing', editing);
    inner.addEventListener('click', event => {
      // Events here come from another realm; do not use parent-window instanceof checks.
      const target = event.target as Element | null;
      if (!target?.closest) return;
      const link = target.closest<HTMLAnchorElement>('a');
      const edit = editFor(target);
      if (edit) {
        if (link || target.closest('summary')) event.preventDefault();
        return;
      }
      const sectionId = target.closest<HTMLElement>('[data-section]')?.dataset.section;
      if (mode === 'inspect' && sectionId) {
        event.preventDefault();
        handlers.onInspect(sectionId);
        return;
      }
      if (link) {
        event.preventDefault();
        const href = link.getAttribute('href') ?? '';
        if (!href.startsWith('#')) {
          handlers.onExternalLink(href);
          return;
        }
        let fragment = href.slice(1);
        try { fragment = decodeURIComponent(fragment); } catch { /* Use the literal fragment. */ }
        const destination = document.getElementById(fragment);
        if (destination) {
          destination.tabIndex = -1;
          destination.focus({ preventScroll: true });
          destination.scrollIntoView({ block: 'start', behavior: 'instant' });
        }
      }
    });
    // A middle click or browser context menu must not load a site into the editor frame.
    inner.addEventListener('auxclick', event => {
      if ((event.target as Element | null)?.closest?.('a')) event.preventDefault();
    });
    inner.addEventListener('contextmenu', event => {
      if ((event.target as Element | null)?.closest?.('a')) event.preventDefault();
    });
    inner.addEventListener('keydown', event => {
      const target = event.target as HTMLElement;
      const edit = editFor(target);
      if (edit && event.key === 'Enter' && !multiline.has(edit.field) && !event.isComposing) {
        event.preventDefault();
        target.blur();
      }
      if (edit && event.key === 'Escape') {
        event.preventDefault();
        target.blur();
      }
    });
    inner.addEventListener('paste', event => {
      const target = event.target as HTMLElement;
      if (!editFor(target) || target.contentEditable === 'plaintext-only') return;
      event.preventDefault();
      const text = event.clipboardData?.getData('text/plain') ?? '';
      document.execCommand('insertText', false, text);
    });
    inner.addEventListener('input', event => {
      const edit = editFor(event.target as Element);
      if (edit) handlers.onEdit(edit);
    });
    inner.addEventListener('drop', event => {
      if (editFor(event.target as Element)) event.preventDefault();
    });
    inner.addEventListener('focusin', event => {
      const edit = editFor(event.target as Element);
      if (edit) handlers.onFocus(edit);
    });
    inner.addEventListener('focusout', event => {
      const target = event.target as HTMLElement;
      const edit = editFor(target);
      if (edit) {
        if (target.innerText !== edit.text) target.textContent = edit.text;
        handlers.onEditingEnd(edit);
      }
    });
    if (draft) render(draft);
  }

  frame.addEventListener('load', rootInit);
  frame.srcdoc = previewDocument(pageFonts, [artwork, serif, sans].map(absolute));
  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(entries => {
      const width = Math.round(entries[0].contentRect.width);
      if (width) handlers.onResize(width);
    }).observe(frame);
  } else {
    window.addEventListener('resize', () => handlers.onResize(frame.clientWidth));
    frame.addEventListener('load', () => handlers.onResize(frame.clientWidth));
  }

  return {
    render,
    select,
    node,
    mirrorAction(edit: CanvasEdit) {
      if (edit.field !== 'action' || !inner) return;
      for (const element of inner.querySelectorAll<HTMLElement>('[data-edit="action"]')) {
        if (element.closest<HTMLElement>('[data-section]')?.dataset.section === edit.sectionId) continue;
        element.textContent = edit.text;
      }
    },
    setMode(next: Mode) {
      mode = next;
      if (inner) inner.documentElement.dataset.mode = next;
    },
    setEditing(next: boolean) {
      editing = next;
      if (inner) {
        inner.documentElement.toggleAttribute('data-editing', editing);
        applyCanvasEdit(inner);
      }
    },
  };
}
