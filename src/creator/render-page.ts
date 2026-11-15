import { allBlocks, patterns, type Block, type Sheet } from './model';

const bars = (count = 3) => `<span class="bars" aria-hidden="true">${'<i></i>'.repeat(count)}</span>`;
const media = '<div class="media" aria-hidden="true"></div>';
const heading = '<span class="heading" aria-hidden="true"></span>';

function geometry(item: Block, linked: boolean, targets: Block[]): string {
  switch (item.kind) {
    case 'group':
      return `<div class="group-frame"><div class="group measure" data-inside="${item.id}" data-arrangement="${item.arrangement ?? 'stack'}">
        ${(item.children ?? []).map(child => region(child, linked, targets)).join('')}
        <div class="group-zone" data-inside="${item.id}">Drop into group</div>
      </div></div>`;
    case 'nav':
      return `<nav aria-label="Prototype navigation"><span class="mark" aria-hidden="true"></span><div>${targets.slice(0, 3).map((target, index) => `<a href="#${target.id}">Region ${index + 1}</a>`).join('')}</div></nav>`;
    case 'split':
      return `<div class="split measure"><div>${heading}${bars()}</div>${media}</div>`;
    case 'stack':
      return `<div class="reading">${heading}${bars(4)}</div>`;
    case 'grid':
      return `<ul class="tiles measure" role="list" style="--columns:${item.columns}">${Array.from({ length: item.columns }, () => `<li>${media}${bars(2)}</li>`).join('')}</ul>`;
    case 'media':
      return media;
    case 'disclosure':
      return `<details><summary>Expand region</summary>${bars()}</details>`;
    case 'action':
      return linked ? '<button type="button" data-follow>Continue to next layout <span aria-hidden="true">→</span></button>' : '<span class="action-slot" aria-hidden="true"></span>';
  }
}

function region(item: Block, linked: boolean, targets: Block[]): string {
  return `<section id="${item.id}" data-block="${item.id}" data-kind="${item.kind}" data-effect="${item.effect}"
    data-range="${item.range ?? 'entry'}" data-intensity="${item.intensity ?? 'regular'}" data-spacing="${item.spacing}" aria-label="${patterns[item.kind].label}">
    <button type="button" class="handle" data-select aria-label="Select ${patterns[item.kind].label}; drag to move">⠿ <span>${patterns[item.kind].label}</span></button>
    <div class="region">${geometry(item, linked, targets)}</div>
  </section>`;
}

export function canvasMarkup(sheet: Sheet, linked: boolean) {
  const targets = allBlocks(sheet.blocks).filter(item => item.kind !== 'nav');
  return `<div class="layout">${sheet.blocks.map(item => region(item, linked, targets)).join('')}
    <div class="end-zone" data-end>${sheet.blocks.length ? 'Drop to append' : 'Drag an element here, or add one from the palette'}</div>
  </div>`;
}
