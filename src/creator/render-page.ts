import styles from './page.css?raw';
import { draftLabel, safeHref, type Draft, type Section } from './model';

export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!
));

export function sectionAnchor(draft: Draft, section: Section) {
  const firstOfKind = draft.sections.find(item => item.kind === section.kind);
  if (section.id !== firstOfKind?.id) return `section-${section.id}`;
  if (section.kind === 'benefits') return 'toolkit';
  return section.kind;
}

function pageHead() {
  return '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">';
}

export function previewDocument(fonts: string) {
  return `<!doctype html><html lang="en" data-studio-preview>
<head>${pageHead()}
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:">
<title>Page preview</title><style>${fonts}\n${styles}</style></head><body></body></html>`;
}

function mark(enabled: boolean, field: string, label: string, itemId?: string) {
  if (!enabled) return '';
  return ` data-edit="${field}" data-edit-label="${label}"${itemId ? ` data-item="${itemId}"` : ''}`;
}

function renderAction(draft: Draft, section: Section, editable: boolean, resolvedHref: string) {
  if (!section.showAction) return '';
  const href = safeHref(resolvedHref);
  const label = draft.brief.action.trim() || (editable ? 'Add an action label' : '');
  if (!label || (!href && !editable)) return '';
  const name = `<span${mark(editable, 'action', 'Action label')}>${escapeHtml(label)}</span>`;
  return href
    ? `<a class="page-action" href="${escapeHtml(href)}">${name}<span aria-hidden="true">↗&#xfe0e;</span></a>`
    : `<span class="page-action page-action-pending">${name}<span aria-hidden="true">↗&#xfe0e;</span></span>`;
}

function sectionEntries(section: Section, editable: boolean) {
  const rows = section.items.filter(item => editable || item.title.trim());
  if (!rows.length) return '';
  if (section.kind === 'faq') {
    return `<div class="page-disclosures">${rows.map(item => `
      <details name="disclosure-${section.id}"${editable ? ` data-entry="${item.id}"` : ''}>
        <summary><span${mark(editable, 'item-title', 'FAQ question', item.id)}>${escapeHtml(item.title)}</span></summary>
        <p${mark(editable, 'item-body', 'FAQ answer', item.id)}>${escapeHtml(item.body)}</p>
      </details>`).join('')}
    </div>`;
  }

  const tag = section.kind === 'steps' ? 'ol' : 'ul';
  return `<${tag} class="page-entries" role="list">
    ${rows.map((item, index) => `<li>
      <span class="page-entry-index" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
      <h3${mark(editable, 'item-title', 'Entry title', item.id)}>${escapeHtml(item.title)}</h3>
      <p${mark(editable, 'item-body', 'Entry text', item.id)}>${escapeHtml(item.body)}</p>
    </li>`).join('')}
  </${tag}>`;
}

function heroArt(draft: Draft, artworkUrl: string) {
  if (draft.artwork === 'none') return '';
  return `<div class="page-art" aria-hidden="true">
    ${draft.artwork === 'forma' && artworkUrl
      ? `<img src="${escapeHtml(artworkUrl)}" alt="" decoding="async">`
      : '<span class="page-art-form"></span>'}
  </div>`;
}

export function renderPageSection(draft: Draft, section: Section, editable: boolean, artworkUrl: string, href: string) {
  const headingTag = section.kind === 'hero' && draft.sections[0]?.id === section.id ? 'h1' : 'h2';
  const anchor = sectionAnchor(draft, section);
  const title = section.title || (editable ? '' : draftLabel(draft));
  return `<section class="page-section page-${section.kind}" id="${anchor}" aria-labelledby="${anchor}-heading"${editable ? ` data-section="${section.id}"` : ''}>
    <div class="page-inner">
      <div class="page-section-copy">
        ${section.eyebrow || editable ? `<p class="page-eyebrow"${mark(editable, 'eyebrow', 'Section label')}>${escapeHtml(section.eyebrow)}</p>` : ''}
        <${headingTag} id="${anchor}-heading"${mark(editable, 'title', 'Section heading')}>${escapeHtml(title)}</${headingTag}>
        ${section.body || editable ? `<p class="page-body"${mark(editable, 'body', 'Section copy')}>${escapeHtml(section.body)}</p>` : ''}
        ${renderAction(draft, section, editable, href)}
      </div>
      ${section.kind === 'hero' ? heroArt(draft, artworkUrl) : ''}
      ${section.kind === 'benefits' || section.kind === 'faq' || section.kind === 'steps' ? sectionEntries(section, editable) : ''}
    </div>
  </section>`;
}

export function pageBody(draft: Draft, editable: boolean, artworkUrl: string, href: string) {
  const title = escapeHtml(draftLabel(draft));
  const leadsWithHero = draft.sections[0]?.kind === 'hero';
  const overview = draft.sections.find(item => item.kind === 'benefits' || item.kind === 'text' || item.kind === 'steps');
  const faq = draft.sections.find(item => item.kind === 'faq');
  return `<a href="#page-main" class="page-skip">Skip to content</a>
    <header class="page-masthead">
      <a class="page-wordmark" href="#page-main"><span class="page-mark" aria-hidden="true"></span>${title}</a>
      ${overview || faq ? `<nav aria-label="Page navigation">
        ${overview ? `<a href="#${sectionAnchor(draft, overview)}">${overview.kind === 'steps' ? 'Steps' : 'Overview'}</a>` : ''}
        ${faq ? `<a href="#${sectionAnchor(draft, faq)}">FAQ</a>` : ''}
      </nav>` : ''}
    </header>
    <main id="page-main" tabindex="-1">
      ${leadsWithHero ? '' : `<div class="page-title"><h1>${title}</h1></div>`}
      ${draft.sections.map(section => renderPageSection(draft, section, editable, artworkUrl, href)).join('')}
      ${!draft.sections.length && editable ? '<p class="page-empty">Add a section to start building this page.</p>' : ''}
    </main>
    <footer class="page-foot"><span class="page-wordmark"><span class="page-mark" aria-hidden="true"></span>${title}</span><a href="#page-main">Back to top ↑</a></footer>`;
}

export function exportPage(draft: Draft, artworkUrl: string, fonts: string, href: string) {
  return `<!doctype html>
<html lang="en" data-theme="${draft.theme}">
<head>
  ${pageHead()}
  <meta name="description" content="${escapeHtml(draft.brief.promise)}">
  <title>${escapeHtml(draftLabel(draft))}</title>
  <style>${fonts}\n${styles}</style>
</head>
<body>
${pageBody(draft, false, artworkUrl, href)}
</body>
</html>`;
}

export function reviewPage(draft: Draft, resolvedHref: string) {
  const issues: string[] = [];
  const actions = draft.sections.filter(section => section.showAction).length;
  const href = safeHref(resolvedHref);
  if (!draft.sections.length) issues.push('Add a section to give this page content.');
  if (!actions) issues.push('Place the primary action in a section so readers have a next step.');
  if (actions && !draft.brief.action.trim()) issues.push('Give the primary action a label.');
  if (actions && !href) issues.push('Set a valid action destination to include a working link in the export.');
  if (actions && href.startsWith('#')) {
    let anchor: string = href.slice(1);
    try { anchor = decodeURIComponent(anchor); } catch { /* Retain the entered fragment. */ }
    if (anchor !== 'page-main' && !draft.sections.some(section => sectionAnchor(draft, section) === anchor)) {
      issues.push(`The action points to ${href}, but that section is missing.`);
    }
  }
  if (draft.actionPolicy === 'single' && actions > 1) issues.push('The philosophy calls for one primary action placement.');
  if (draft.sections.some(section => !section.title.trim())) issues.push('Give every section a heading to help readers navigate.');
  if (draft.sections.some(section => section.items.some(item => !item.title.trim()))) issues.push('Add a title to each list entry that you want to include.');
  return issues;
}
