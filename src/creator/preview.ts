import { type Mode } from '../inspect';
import { bindDrag, type Point } from './drag';
import { type Placement, type Sheet } from './model';
import styles from './page.css?raw';
import { canvasMarkup } from './render-page';

export function createCanvas(host: HTMLElement, handlers: {
  pick(id: string, inspect: boolean): void;
  follow(): void;
  moveDrag(id: string, point: Point): void;
  finishDrag(id: string, point?: Point): void;
  resize(width: number): void;
  scroll(percent: number, available: boolean): void;
}) {
  const root = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = styles;
  const surface = document.createElement('div');
  root.append(style, surface);
  host.dataset.motion = document.documentElement.dataset.motion;
  let active: string | undefined;
  let marker: HTMLElement | undefined;

  function clearDrop() {
    marker?.classList.remove('drop-before', 'drop-after', 'drop-inside', 'drop-left', 'drop-right');
    marker = undefined;
  }

  function node(id: string) {
    return root.getElementById(id) ?? undefined;
  }

  function reveal(section: HTMLElement) {
    host.scrollTop += section.getBoundingClientRect().top - host.getBoundingClientRect().top - 8;
  }

  function select(id?: string, scroll = false) {
    active = id;
    for (const section of surface.querySelectorAll<HTMLElement>('[data-block]')) {
      section.toggleAttribute('data-current', section.id === id);
    }
    const region = id && node(id);
    if (region && scroll) reveal(region);
  }

  function render(sheet: Sheet, linked: boolean, reset = false) {
    const open = new Set(reset ? [] : Array.from(surface.querySelectorAll('details[open]'), item => item.closest('[data-block]')?.id));
    const y = reset ? 0 : host.scrollTop;
    surface.innerHTML = canvasMarkup(sheet, linked);
    for (const id of open) if (id) node(id)?.querySelector('details')?.setAttribute('open', '');
    host.scrollTop = y;
    select(active);
    syncScroll();
  }

  surface.addEventListener('click', event => {
    const target = event.target as HTMLElement;
    const section = target.closest<HTMLElement>('[data-block]');
    const inspect = host.dataset.mode === 'inspect';
    if (section && (inspect || target.closest('[data-select]'))) {
      event.preventDefault();
      handlers.pick(section.id, inspect);
    } else if (target.closest('[data-follow]')) handlers.follow();
    else {
      const link = target.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!link) return;
      event.preventDefault();
      const destination = node(link.hash.slice(1));
      if (!destination) return;
      destination.tabIndex = -1;
      destination.focus({ preventScroll: true });
      reveal(destination);
    }
  });

  bindDrag(surface, target => {
    const handle = target.closest<HTMLElement>('[data-select]');
    const id = handle?.closest<HTMLElement>('[data-block]')?.id;
    if (handle && id) return { handle, value: id };
  }, event => ({ x: event.clientX, y: event.clientY }), { move: handlers.moveDrag, finish: handlers.finishDrag });

  const maxScroll = () => Math.max(0, host.scrollHeight - host.clientHeight);
  function syncScroll() {
    const max = maxScroll();
    handlers.scroll(max ? Math.round(100 * host.scrollTop / max) : 0, max > 0);
  }
  function resize() {
    handlers.resize(host.clientWidth);
    syncScroll();
  }
  host.addEventListener('scroll', syncScroll, { passive: true });
  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    observer.observe(surface);
  } else window.addEventListener('resize', resize);

  function dropSpot(point: Point, scroll = false): Placement | undefined {
    clearDrop();
    const rect = host.getBoundingClientRect();
    const y = point.y - rect.top;
    if (point.x < rect.left || point.x >= rect.right || y < 0 || y >= rect.height) return;
    if (scroll && (y < 40 || y > rect.height - 40)) host.scrollTop += y < 40 ? -5 : 5;
    const hit = root.elementFromPoint(point.x, point.y);
    const candidate = hit?.closest<HTMLElement>('[data-block], [data-inside], [data-end]');
    const regions = [...surface.querySelectorAll<HTMLElement>('.layout > [data-block], .layout > [data-end]')];
    marker = candidate ?? regions.find(item => item.getBoundingClientRect().bottom >= point.y) ?? regions.at(-1);
    if (!marker) return;
    if (marker.dataset.inside) {
      marker.classList.add('drop-inside');
      return { target: marker.dataset.inside, position: 'inside' };
    }
    const box = marker.getBoundingClientRect();
    const row = marker.parentElement?.dataset.arrangement === 'row'
      && getComputedStyle(marker.parentElement).gridTemplateColumns.split(' ').length > 1;
    const after = row ? point.x > box.left + box.width / 2 : point.y > box.top + box.height / 2;
    const position = marker.id && after ? 'after' : 'before';
    marker.classList.add(row ? (after ? 'drop-right' : 'drop-left') : `drop-${position}`);
    return { target: marker.id || undefined, position };
  }

  return {
    render, node, select, clearDrop, dropSpot,
    play(on: boolean) { host.toggleAttribute('data-playing', on); syncScroll(); },
    staticMotion(on: boolean) { host.dataset.motion = on ? 'reduce' : document.documentElement.dataset.motion; },
    dragging(on: boolean) { host.toggleAttribute('data-dragging', on); },
    motionStart(id: string) {
      const region = node(id)?.querySelector<HTMLElement>(':scope > .region');
      if (region) host.scrollTop += region.getBoundingClientRect().top - host.getBoundingClientRect().bottom + 2;
    },
    scrub(percent: number) { host.scrollTop = maxScroll() * percent / 100; },
    scrollTop: () => { host.scrollTop = 0; },
    mode(next: Mode) { host.dataset.mode = next; },
  };
}
