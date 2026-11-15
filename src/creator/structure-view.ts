import { iconMarkup } from './icons';
import { allBlocks, arrangements, effects, intensities, locate, patterns, ranges, spacings, type Block } from './model';

export function outlineMarkup(items: Block[], selected?: string): string {
  return items.map(item => `<li><button type="button" data-action="pick" data-id="${item.id}"${selected === item.id ? ' aria-current="true"' : ''}>${iconMarkup(patterns[item.kind].icon)}${patterns[item.kind].label}</button>
    ${item.children?.length ? `<ol>${outlineMarkup(item.children, selected)}</ol>` : ''}</li>`).join('');
}

function makeOptions(values: Record<string, string>, selected: string) {
  return Object.entries(values).map(([id, name]) => `<option value="${id}"${id === selected ? ' selected' : ''}>${name}</option>`).join('');
}

export function propertiesMarkup(blocks: Block[], selected?: string): string {
  const location = locate(blocks, selected);
  if (!location) {
    return '<p>Select an element to adjust its layout and motion.</p>';
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
  return `
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
