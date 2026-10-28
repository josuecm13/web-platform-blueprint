import './chromatic.css';

// Keep the real DOM as the source, including links, forms and the canvas board.
// API reference: https://developer.chrome.com/docs/web-platform/html-in-canvas/2d
type DrawableCanvas = HTMLCanvasElement & { requestPaint?: () => void };
type DrawableContext = CanvasRenderingContext2D & {
  drawElementImage?: (element: HTMLElement, x: number, y: number, width: number, height: number) => void;
};

const surface = document.createElement('canvas') as DrawableCanvas;
surface.setAttribute('content', 'drawable');
const context = surface.getContext('2d', { willReadFrequently: true }) as DrawableContext | null;
const supported = 'content' in surface && typeof surface.requestPaint === 'function'
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
  let ratio = window.devicePixelRatio || 1;

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
    const height = Math.ceil(source.scrollHeight);
    const width = Math.round(source.offsetWidth * ratio);
    const pixelsHigh = Math.round(height * ratio);
    // CSS layout stays in CSS pixels; only the backing bitmap uses device pixels.
    surface.style.width = `${source.offsetWidth}px`;
    surface.style.height = `${height}px`;
    if (surface.width !== width || surface.height !== pixelsHigh) {
      surface.width = width;
      surface.height = pixelsHigh;
    }
    surface.requestPaint!();
  }

  surface.addEventListener('paint', () => {
    if (failed) return;
    try {
      // drawElementImage's default size is already in canvas-grid pixels.
      // Applying the DPR transform again zooms the page and its hit geometry.
      // Use an identity transform and an explicit destination covering the bitmap.
      // The API maps that destination back to the canvas's CSS box for hit testing.
      context!.setTransform(1, 0, 0, 1, 0, 0);
      context!.clearRect(0, 0, surface.width, surface.height);
      context!.drawElementImage!(source, 0, 0, surface.width, surface.height);
      const split = Math.round(Number(slider.value) * ratio);
      if (!split) return;
      const image = context!.getImageData(0, 0, surface.width, surface.height);
      const original = new Uint8ClampedArray(image.data);
      // Shift only color channels; preserve green, alpha and DOM hit geometry.
      for (let y = 0; y < image.height; y++) {
        const row = y * image.width;
        for (let x = 0; x < image.width; x++) {
          const pixel = (row + x) * 4;
          image.data[pixel] = original[(row + Math.max(0, x - split)) * 4];
          image.data[pixel + 2] = original[(row + Math.min(image.width - 1, x + split)) * 4 + 2];
        }
      }
      context!.putImageData(image, 0, 0);
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
  // Restore observers after back/forward cache navigation without a render loop.
  window.addEventListener('pageshow', resize);
  resize();
}
