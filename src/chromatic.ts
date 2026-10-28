import './chromatic.css';

// Keep the real DOM as the source, including links, forms and the canvas board.
// API reference: https://developer.chrome.com/docs/web-platform/html-in-canvas/2d
type DrawableCanvas = HTMLCanvasElement & {
  requestPaint?: () => void;
  updateElementGeometry?: (element: HTMLElement, options: { canvasTransform: DOMMatrix }) => void;
};
type DrawableContext = CanvasRenderingContext2D & {
  drawElementImage?: (element: HTMLElement, x: number, y: number, width: number, height: number,
    options: { preserveElementGeometry: boolean }) => void;
};

const surface = document.createElement('canvas') as DrawableCanvas;
surface.setAttribute('content', 'drawable');
const context = surface.getContext('2d', { willReadFrequently: true }) as DrawableContext | null;
const supported = 'content' in surface && typeof surface.requestPaint === 'function'
  && typeof surface.updateElementGeometry === 'function'
  && typeof context?.drawElementImage === 'function';
const controls = document.createElement('details');
controls.className = 'chromatic-settings';
controls.innerHTML = `<summary>Chromatic aberration</summary>
  <label for="page-channel-split">Channel split</label>
  <input id="page-channel-split" type="range" min="0" max="8" value="2">
  <output for="page-channel-split">2 px</output>
  <button type="button">Use normal HTML</button>
  <p role="status"></p>`;
const slider = controls.querySelector('input')!;
const value = controls.querySelector('output')!;
const status = controls.querySelector('p')!;
const restore = controls.querySelector('button')!;

if (!supported || !context) {
  slider.disabled = true;
  restore.hidden = true;
  value.textContent = 'Unavailable';
  status.textContent = 'Showing normal HTML. This effect requires a browser with HTML-in-Canvas support.';
  document.body.append(controls);
} else {
  const source = document.createElement('div');
  source.className = 'chromatic-page-source';
  source.setAttribute('drawable', '');
  surface.className = 'chromatic-page-canvas';
  const background = getComputedStyle(document.body).backgroundColor;
  source.style.backgroundColor = background;
  source.append(...Array.from(document.body.childNodes));
  surface.append(source);
  document.body.append(surface, controls);
  status.textContent = 'Applied to the whole page. Set the split to 0 to remove the effect.';
  let failed = false;
  let leaving = false;
  // Navigation glitch strength, 0..1. Adds to the slider split and tears rows.
  let glitch = 0;
  let ratio = window.devicePixelRatio || 1;
  let pendingWidth = 0;
  let pendingHeight = 0;

  function fallback() {
    if (failed) return;
    failed = true;
    observer.disconnect();
    document.body.insertBefore(source, surface);
    surface.remove();
    source.style.width = '';
    slider.disabled = true;
    restore.hidden = true;
    value.textContent = 'Unavailable';
    status.textContent = 'The effect could not be rendered. Showing normal HTML.';
  }

  function resize() {
    if (failed) return;
    source.style.width = `${document.documentElement.clientWidth}px`;
    ratio = window.devicePixelRatio || 1;
    // The drawable snapshot is the border box, not the scrollable overflow.
    const height = source.offsetHeight;
    pendingWidth = Math.round(source.offsetWidth * ratio);
    pendingHeight = Math.round(height * ratio);
    // CSS layout stays in CSS pixels; only the backing bitmap uses device pixels.
    surface.style.width = `${source.offsetWidth}px`;
    surface.style.height = `${height}px`;
    // Keep the previous bitmap visible until the paint event has a fresh DOM
    // snapshot. Assigning width/height here clears it while that paint is pending.
    surface.requestPaint!();
  }

  surface.addEventListener('paint', () => {
    if (failed) return;
    try {
      // Commit sizing and drawing in the same callback, with no empty frame
      // between them. Repeated resize notifications collapse to the latest size.
      // Changing either attribute clears the bitmap, even at the same value.
      if (surface.width !== pendingWidth) surface.width = pendingWidth;
      if (surface.height !== pendingHeight) surface.height = pendingHeight;
      // drawElementImage's default size is already in canvas-grid pixels.
      // Applying the DPR transform again zooms the page and its hit geometry.
      // Use an identity transform and an explicit destination covering the bitmap.
      // Geometry is registered explicitly below, in CSS pixels (not bitmap pixels).
      context!.setTransform(1, 0, 0, 1, 0, 0);
      context!.clearRect(0, 0, surface.width, surface.height);
      context!.drawElementImage!(source, 0, 0, surface.width, surface.height,
        { preserveElementGeometry: true });
      const split = Math.round((Number(slider.value) + glitch * 14) * ratio);
      if (split || glitch) {
        // Process only visible rows. Reading and copying an entire long page on
        // every hover/focus repaint can monopolize the main thread and stall input.
        const rect = surface.getBoundingClientRect();
        const scaleY = surface.height / rect.height;
        const top = Math.max(0, Math.floor(-rect.top * scaleY));
        const bottom = Math.min(surface.height, Math.ceil((window.innerHeight - rect.top) * scaleY));
        if (bottom > top) {
          const image = context!.getImageData(0, top, surface.width, bottom - top);
          const original = new Uint8ClampedArray(image.data);
          const last = image.width - 1;
          const tear = glitch ? tearRows(image.height, glitch * 40 * ratio) : null;
          // Shift only color channels; preserve green, alpha and DOM hit geometry.
          // During a navigation glitch, torn rows also slide all channels sideways.
          for (let y = 0; y < image.height; y++) {
            const row = y * image.width;
            const dx = tear ? tear[y] : 0;
            for (let x = 0; x < image.width; x++) {
              const pixel = (row + x) * 4;
              image.data[pixel] = original[(row + Math.min(last, Math.max(0, x - split + dx))) * 4];
              image.data[pixel + 2] = original[(row + Math.min(last, Math.max(0, x + split + dx))) * 4 + 2];
              if (dx) {
                const from = (row + Math.min(last, Math.max(0, x + dx))) * 4;
                image.data[pixel + 1] = original[from + 1];
                image.data[pixel + 3] = original[from + 3];
              }
            }
          }
          context!.putImageData(image, 0, top);
        }
      }
      // Pixels and input geometry are separate responsibilities. The full-page
      // source and canvas have identical CSS boxes, so their mapping is identity.
      // Register the live subtree after postprocessing, including at split zero.
      // Native events, focus and selection remain with the original DOM nodes.
      surface.updateElementGeometry!(source, { canvasTransform: new DOMMatrix() });
    } catch {
      fallback();
    }
  });
  slider.addEventListener('input', () => {
    value.textContent = `${slider.value} px`;
    surface.requestPaint!();
  });
  restore.addEventListener('click', () => {
    fallback();
    value.textContent = 'Off';
    status.textContent = 'Showing normal HTML. Reload the page to enable the effect again.';
  });
  const observer = new ResizeObserver(resize);
  observer.observe(source);
  window.addEventListener('resize', resize);
  window.addEventListener('scroll', () => {
    if (!failed) surface.requestPaint!();
  }, { passive: true });
  // Restore observers after back/forward cache navigation without a render loop.
  window.addEventListener('pageshow', resize);
  // A page restored from the back/forward cache may still be mid-glitch.
  window.addEventListener('pageshow', () => {
    leaving = false;
    glitch = 0;
    surface.style.translate = '';
  });

  // Random horizontal bands, each offset sideways by up to maxOffset bitmap pixels.
  function tearRows(height: number, maxOffset: number) {
    const rows = new Int32Array(height);
    const bands = 2 + Math.floor(glitch * 6);
    for (let n = 0; n < bands; n++) {
      const top = Math.floor(Math.random() * height);
      const bottom = Math.min(height, top + Math.ceil(Math.random() * height * 0.12));
      rows.fill(Math.round((Math.random() * 2 - 1) * maxOffset), top, bottom);
    }
    return rows;
  }

  function reducedMotion() {
    return document.documentElement.dataset.motion === 'reduce'
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Drive the glitch with animation frames only while it plays; no idle loop.
  function playGlitch(duration: number, strength: (t: number) => number, done: () => void) {
    const start = performance.now();
    const frame = (now: number) => {
      if (failed) return done();
      const t = Math.min(1, (now - start) / duration);
      glitch = strength(t) * (0.6 + Math.random() * 0.4);
      const shake = glitch * 8;
      surface.style.translate = `${(Math.random() - 0.5) * shake}px ${(Math.random() - 0.5) * shake}px`;
      surface.requestPaint!();
      if (t < 1) requestAnimationFrame(frame);
      else done();
    };
    requestAnimationFrame(frame);
  }

  // Glitch out before same-site page navigations. Modified clicks, new tabs,
  // downloads, external and same-page links keep native behavior.
  document.addEventListener('click', event => {
    const link = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey
      || event.shiftKey || event.altKey || failed || leaving) return;
    if ((link.target && link.target !== '_self') || link.hasAttribute('download')) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search) return;
    if (reducedMotion()) return;
    event.preventDefault();
    leaving = true;
    try { sessionStorage.setItem('blueprint-glitch', '1'); } catch { /* arrival settle is optional */ }
    playGlitch(420, t => Math.min(1, t * 1.6), () => location.assign(url.href));
  });

  resize();

  // Settle the glitch on the page we arrived at.
  let arrived = false;
  try {
    arrived = sessionStorage.getItem('blueprint-glitch') === '1';
    sessionStorage.removeItem('blueprint-glitch');
  } catch { /* storage unavailable */ }
  if (arrived && !reducedMotion()) {
    playGlitch(320, t => 1 - t, () => {
      glitch = 0;
      surface.style.translate = '';
      surface.requestPaint!();
    });
  }
}
