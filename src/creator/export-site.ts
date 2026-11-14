import { strToU8, zipSync } from 'fflate';
import { activeDraft, draftLabel, type Project } from './model';
import { pageFiles, pageLink } from './pages';
import { htmlDownload } from './export-page';
import { escapeHtml } from './render-page';

export function downloadSite(project: Project) {
  const files = pageFiles(project);
  const list = project.drafts.map(draft => {
    const path = files.get(draft.id)!;
    return `<li><a href="${path}">${escapeHtml(draftLabel(draft))}</a></li>`;
  });
  const start = files.get(activeDraft(project).id)!;
  const contents = Object.fromEntries(project.drafts.map(draft => [
    files.get(draft.id)!,
    strToU8(htmlDownload(draft, pageLink(draft, files))),
  ]));
  contents['start-here.html'] = strToU8(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Project pages</title>
  <style>
    body { font: 1rem/1.65 system-ui,sans-serif; max-width: 38rem; padding: 2rem 1.25rem; margin: auto; background: #f7f8fc; color: #1d2436; }
    a { color: #273ab6; text-underline-offset: .2em; }
  </style>
</head>
<body><main><h1>Project pages</h1><p><a href="${start}">Open the active page</a></p><ul>${list.join('\n')}</ul></main></body>
</html>`);
  return zipSync(contents, { level: 3 });
}
