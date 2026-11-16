export type Point = { x: number; y: number };

export function bindDrag<T>(
  root: HTMLElement,
  source: (target: Element) => { handle: HTMLElement; value: T } | undefined,
  point: (event: PointerEvent) => Point,
  handlers: { move(value: T, point: Point): void; finish(value: T, point?: Point): void },
) {
  let pending: { id: number; start: Point; handle: HTMLElement; value: T; moved: boolean } | undefined;
  let suppressClick = false;
  root.addEventListener('pointerdown', event => {
    if (pending || !event.isPrimary || event.button !== 0) return;
    suppressClick = false;
    const origin = source(event.target as Element);
    if (!origin) return;
    pending = { id: event.pointerId, start: point(event), ...origin, moved: false };
    origin.handle.setPointerCapture(event.pointerId);
  });
  root.addEventListener('pointermove', event => {
    if (!pending || event.pointerId !== pending.id) return;
    const next = point(event);
    if (!pending.moved && Math.hypot(next.x - pending.start.x, next.y - pending.start.y) < 6) return;
    pending.moved = true;
    handlers.move(pending.value, next);
  });
  function finish(event: PointerEvent) {
    if (!pending || pending.id !== event.pointerId) return;
    const drag = pending;
    pending = undefined;
    if (!drag.moved) return;
    suppressClick = true;
    handlers.finish(drag.value, event.type === 'pointerup' ? point(event) : undefined);
  }
  root.addEventListener('pointerup', finish);
  root.addEventListener('pointercancel', finish);
  root.addEventListener('lostpointercapture', finish);
  root.addEventListener('click', event => {
    if (!suppressClick || event.detail === 0) return;
    suppressClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
}
