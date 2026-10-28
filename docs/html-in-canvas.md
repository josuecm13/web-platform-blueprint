# Whole-page HTML-in-Canvas experiment

Related: [issue #5](https://github.com/josuecm13/web-platform-blueprint/issues/5), [MVP PR #6](https://github.com/josuecm13/web-platform-blueprint/pull/6).

The project owner requested chromatic aberration across the whole page, expanding the original Playground-only proposal. The original page nodes, including their listeners, become a single drawable subtree. The Playground board retains its own rendering code. Controls outside the canvas adjust the channel split and restore ordinary HTML.

The entry module in each document's head uses `blocking="render"` so initialization can move HTML into the canvas before the first paint. This avoids first showing normal HTML and then replacing it with an unpainted canvas. Vite recreates entry script tags during bundling, so the build's final HTML transform preserves the render-blocking attribute. This can delay first paint until the small entry module loads; no CSS hides the page, so script failure or disabled JavaScript does not leave content hidden. See [the script blocking attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script#blocking). Visual confirmation in a browser remains pending.

## Coordinate mapping

The canvas CSS box matches the page's CSS border-box width and height. Its bitmap dimensions are those dimensions multiplied by devicePixelRatio, rounded to integers. The 2D context uses an identity transform and `drawElementImage(source, 0, 0, canvas.width, canvas.height, { preserveElementGeometry: true })`.

The explicit destination uses canvas-grid pixels. After pixel processing, `canvas.updateElementGeometry(source, { canvasTransform: new DOMMatrix() })` explicitly registers the live subtree at its original CSS position. The identity mapping is deliberate: the source border box and canvas CSS box have the same dimensions. Geometry is registered even when the split is zero. The implementation requires this explicit geometry API and falls back to ordinary HTML if it is missing. No pointer events are synthesized or forwarded; the original nodes retain native behavior.

Applying an additional DPR transform to the API's default raster dimensions caused the original zoom and click-position bug. Pixel processing shifts only red and blue channel values; it does not move the page geometry. Pixel readback and processing are restricted to visible rows to avoid copying an entire long page on every hover or focus repaint. Scrolling requests a new paint for the newly visible rows.

Resize notifications update CSS dimensions and record the latest requested bitmap size, without clearing the displayed bitmap. The `paint` callback commits only changed bitmap dimensions and immediately draws the fresh snapshot. This removes the clear-and-wait gap when the responsive card changes the page height and coalesces multiple reflows before the next paint. Until then, the previous bitmap may briefly scale to the new CSS box. A regression check verifies that resize notifications do not reset the bitmap and that unchanged dimensions are not reassigned.

Primary references, checked 2026-10-27:

- [Chrome: sizing, coordinate units, geometry and feature detection](https://developer.chrome.com/docs/web-platform/html-in-canvas/concepts)
- [Chrome: 2D drawing overloads and automatic geometry synchronization](https://developer.chrome.com/docs/web-platform/html-in-canvas/2d)
- [Chrome: API changes](https://developer.chrome.com/blog/html-in-canvas-ot-changes)

The target is the current `content="drawable"` API with `requestPaint()` and `drawElementImage()`, not the older `layoutsubtree` prototype. Older implementations fall back to ordinary HTML; no origin-trial or deployment registration is configured.

## Navigation glitch

A left click or Enter on a link to another page of this site is held for 420 ms. During that time animation frames raise a glitch strength from 0 to 1. Each paint adds up to 14 px to the slider's channel split. It also moves a few random horizontal bands of rows sideways (all channels, up to 40 px), and the canvas gets a random `translate` shake of up to 8 px. Then the browser navigates. A sessionStorage flag makes the next page play a 320 ms decaying version on arrival.

Modified clicks, middle clicks, `target` other than `_self`, `download`, external links and same-page links keep native behavior. So does reduced motion, from `prefers-reduced-motion` or the Preferences page's `data-motion="reduce"`. Animation frames only run while a glitch plays. The torn rows are pixels only: input geometry stays at its original position, and the page leaves before anyone can click on the moved image.

## Validation

Run `node --test tests/chromatic.test.mjs` and `npm run build`.

The browser-free tests execute the actual module with a DOM/canvas model. They check rendered bounds and explicit geometry registration with the effect active at DPR 1, 1.25, 2 and 3, a density change, channel output, geometry registration at zero split, visible-row processing on a scrolled long page, preservation of the original interactive nodes when restoring ordinary HTML, and unsupported-browser fallback. These tests do not exercise Chromium's native hit-testing implementation. The initial six-test suite used a zero split and did not cover active pixel postprocessing.

Browser verification is pending at the owner's instruction. Do not treat the model tests as evidence that browser clicks, keyboard focus, text selection, native dialogs, accessibility geometry, scrolling, printing or long-page rendering performance have passed. The Reference Dock integration from issue #5 is also outstanding. There is no continuous animation loop outside the navigation glitch; reduced-motion and preference behavior still need browser verification alongside the rest of the page.
