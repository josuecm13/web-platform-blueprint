const paths = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  page: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h4"/>',
  layout: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/>',
  branch: '<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="6" r="2"/><path d="M6 7v10m0-3c0-5 12-2 12-6"/>',
  undo: '<path d="M9 5 4 10l5 5M4 10h11a5 5 0 0 1 0 10h-3"/>',
  redo: '<path d="m15 5 5 5-5 5m5-5H9a5 5 0 0 0 0 10h3"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4"/>',
  upload: '<path d="M12 16V4m-5 5 5-5 5 5M5 16v4h14v-4"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5"/>',
  grid: '<rect x="3" y="4" width="7" height="6" rx="1"/><rect x="14" y="4" width="7" height="6" rx="1"/><rect x="3" y="14" width="7" height="6" rx="1"/><rect x="14" y="14" width="7" height="6" rx="1"/>',
  hero: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h8M7 16h4"/>',
  faq: '<path d="M4 5h16v12H9l-5 4V5Z"/><path d="M9.5 9a2.5 2.5 0 1 1 4.1 1.9c-.8.7-1.6 1.1-1.6 2M12 15h.01"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  text: '<path d="M4 5h16M4 10h16M4 15h16M4 20h9"/>',
  steps: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  settings: '<path d="m9 3-1 3-3 1-2 4 2 2v4l4 3 3-1 3 1 4-3v-4l2-2-2-4-3-1-1-3H9Z"/><circle cx="12" cy="12" r="3"/>',
  desktop: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M12 17v4m-4 0h8"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18h2"/>',
  sliders: '<path d="M4 6h6m4 0h6M4 12h10m4 0h2M4 18h3m4 0h9"/><circle cx="12" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="9" cy="18" r="2"/>',
  inspect: '<circle cx="12" cy="12" r="6"/><path d="M12 2v5m0 10v5M2 12h5m10 0h5"/>',
  edit: '<path d="m5 16-1 4 4-1L20 7l-3-3L5 16Zm9-9 3 3"/>',
  chevrons: '<path d="m8 9 4-4 4 4m-8 6 4 4 4-4"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  up: '<path d="M12 19V5m-6 6 6-6 6 6"/>',
  down: '<path d="M12 5v14m-6-6 6 6 6-6"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  trash: '<path d="M4 6h16m-11 0V3h6v3M6 6l1 14h10l1-14M10 10v6m4-6v6"/>',
  swap: '<path d="M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6 6-2Z"/>',
  code: '<path d="m7 7-5 5 5 5m10-10 5 5-5 5m-3-14-4 18"/>',
  file: '<path d="M6 3h8l4 4v14H6V3Zm8 0v5h4M9 12h6m-6 4h6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
} as const;

export type Icon = keyof typeof paths;

export function iconMarkup(name: Icon) {
  return `<svg class="studio-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name]}</svg>`;
}

export function mountIcons(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('[data-icon]').forEach(element => {
    const name = element.dataset.icon as Icon;
    if (Object.hasOwn(paths, name)) element.insertAdjacentHTML('afterbegin', iconMarkup(name));
    element.removeAttribute('data-icon');
  });
}
