# Whole-page HTML-in-Canvas experiment

Related: [issue #5](https://github.com/josuecm13/web-platform-blueprint/issues/5), [MVP PR #6](https://github.com/josuecm13/web-platform-blueprint/pull/6).

The project owner requested chromatic aberration across the whole page, expanding the original Playground-only proposal. The original page nodes, including their listeners, become a single drawable subtree. The Playground board retains its own rendering code. Controls outside the canvas adjust the channel split and restore ordinary HTML.

## Coordinate mapping

The canvas CSS box matches the page's CSS width and height. Its bitmap dimensions are those dimensions multiplied by devicePixelRatio, rounded to integers. The 2D context uses an identity transform and `drawElementImage(source, 0, 0, canvas.width, canvas.height)`.

The explicit destination uses canvas-grid pixels. The browser automatically maps the element's geometry back through the canvas CSS box for hit testing. Applying an additional DPR transform to the API's default raster dimensions caused the original zoom and click-position bug. Pixel processing shifts only red and blue channel values; it does not move the page geometry.

Primary references, checked 2026-10-27:

- [Chrome: sizing, coordinate units, geometry and feature detection](https://developer.chrome.com/docs/web-platform/html-in-canvas/concepts)
- [Chrome: 2D drawing overloads and automatic geometry synchronization](https://developer.chrome.com/docs/web-platform/html-in-canvas/2d)
- [Chrome: API changes](https://developer.chrome.com/blog/html-in-canvas-ot-changes)

The target is the current `content="drawable"` API with `requestPaint()` and `drawElementImage()`, not the older `layoutsubtree` prototype. Older implementations fall back to ordinary HTML; no origin-trial or deployment registration is configured.

## Validation

Run `node --test tests/chromatic.test.mjs` and `npm run build`.

The browser-free tests execute the actual module with a DOM/canvas model. They check rendered bounds and coordinate round trips at DPR 1, 1.25, 2 and 3, a density change, preservation of the original interactive nodes when restoring ordinary HTML, and unsupported-browser fallback. These tests do not exercise Chromium's native hit-testing implementation.

Browser verification is pending at the owner's instruction. Do not treat the model tests as evidence that browser clicks, keyboard focus, text selection, native dialogs, accessibility geometry, scrolling, printing or long-page rendering performance have passed. The Reference Dock integration from issue #5 is also outstanding. There is no continuous animation loop; reduced-motion and preference behavior still need browser verification alongside the rest of the page.
