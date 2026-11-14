import './layout-measurements.css';

export type LayoutSnapshot = {
  width: number;
  columns: number[];
  rows: number[];
  columnGap: number;
  rowGap: number;
  breakpoint?: number;
};

const numberFormat = new Intl.NumberFormat('en', { maximumFractionDigits: 2 });
const px = (value: number) => `${numberFormat.format(value)} px`;
const number = (value: string) => parseFloat(value) || 0;

function gridTracks(resolvedValue: string) {
  // CSSOM serializes used grid tracks to individual pixel lengths, with
  // optional bracketed line names.
  return [...resolvedValue.replace(/\[[^\]]*\]/g, '').matchAll(/([\d.]+)px/g)]
    .map(([, size]) => Number(size));
}

function trackCount(count: number, axis: 'row' | 'column') {
  return `${count} ${axis}${count === 1 ? '' : 's'}`;
}

function cardState(columns: number) {
  return columns === 2 ? 'Two columns' : 'Stacked';
}

export function previewDescription(layout: LayoutSnapshot) {
  return `${px(layout.width)} · ${cardState(layout.columns.length)}`;
}

export function layoutDetails(layout: LayoutSnapshot) {
  const { width, columns, rows, columnGap, rowGap, breakpoint } = layout;
  return [
    ['Container width', px(width)],
    ['Layout', breakpoint === undefined
      ? `${trackCount(columns.length, 'column')} · ${trackCount(rows.length, 'row')}`
      : cardState(columns.length)],
    ...(breakpoint === undefined ? [] : [['Breakpoint', px(breakpoint)]]),
    ['Column tracks', columns.length ? columns.map(px).join(' / ') : 'None'],
    ['Row tracks', rows.length ? rows.map(px).join(' / ') : 'None'],
    ['Column gap', px(columnGap)],
    ['Row gap', px(rowGap)],
  ];
}

function trackLayer(axis: 'columns' | 'rows') {
  const layer = document.createElement('div');
  layer.className = `measurement-tracks measurement-${axis}`;
  return layer;
}

function drawTracks(layer: HTMLElement, sizes: number[], gap: number) {
  const tracks = sizes.map(size => `${size}px`).join(' ');
  if (layer.classList.contains('measurement-columns')) layer.style.gridTemplateColumns = tracks;
  else layer.style.gridTemplateRows = tracks;
  layer.style.gap = `${gap}px`;

  if (layer.childElementCount !== sizes.length) {
    layer.replaceChildren(...sizes.map(() => document.createElement('span')));
  }
}

function observeGrid(grid: HTMLElement) {
  const queryContainer = grid.closest<HTMLElement>('[data-layout-breakpoint]');
  const container = queryContainer ?? grid;
  const breakpoint = queryContainer ? Number(queryContainer.dataset.layoutBreakpoint) : undefined;
  const subscribers = new Set<(layout: LayoutSnapshot) => void>();
  const gridItems = [...grid.children];
  const overlay = document.createElement('div');
  overlay.className = 'measurement-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  const columns = trackLayer('columns');
  const rows = trackLayer('rows');
  const label = document.createElement('span');
  label.className = 'measurement-label';
  overlay.append(columns, rows, label);
  grid.append(overlay);

  let lastSignature = '';
  function read(): LayoutSnapshot {
    const gridStyle = getComputedStyle(grid);
    const containerStyle = container === grid ? gridStyle : getComputedStyle(container);
    const inlineInsets = number(containerStyle.paddingLeft) + number(containerStyle.paddingRight)
      + number(containerStyle.borderLeftWidth) + number(containerStyle.borderRightWidth);

    return {
      width: Math.max(0, container.getBoundingClientRect().width - inlineInsets),
      columns: gridTracks(gridStyle.gridTemplateColumns),
      rows: gridTracks(gridStyle.gridTemplateRows),
      columnGap: number(gridStyle.columnGap),
      rowGap: number(gridStyle.rowGap),
      breakpoint,
    };
  }

  function update() {
    const layout = read();
    const signature = JSON.stringify(layout);
    if (signature === lastSignature) return layout;
    lastSignature = signature;
    overlay.hidden = !layout.rows.length || !layout.columns.length;

    drawTracks(columns, layout.columns, layout.columnGap);
    drawTracks(rows, layout.rows, layout.rowGap);
    label.textContent = breakpoint === undefined
      ? `${px(layout.width)} · ${trackCount(layout.columns.length, 'column')}`
      : `${previewDescription(layout)} · ${px(breakpoint)} breakpoint`;
    for (const subscriber of subscribers) subscriber(layout);
    return layout;
  }

  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(update);
    observer.observe(container, { box: 'border-box' });
    if (grid !== container) observer.observe(grid, { box: 'border-box' });
    // Filtering the Library can change its tracks without changing the outer box.
    gridItems.forEach(item => observer.observe(item, { box: 'border-box' }));
  } else {
    window.addEventListener('resize', update);
  }
  update();

  return {
    update,
    subscribe(callback: (layout: LayoutSnapshot) => void) {
      const layout = update();
      subscribers.add(callback);
      callback(layout);
      return () => { subscribers.delete(callback); };
    },
  };
}

export const measuredLayouts = new Map(
  [...document.querySelectorAll<HTMLElement>('[data-measure-grid]')].map(grid => [grid, observeGrid(grid)]),
);
