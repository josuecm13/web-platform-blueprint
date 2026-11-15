# Web Platform Blueprint

> A native-first, multipage web application built to investigate what modern HTML, CSS, and browser APIs can do in 2026.

**Web Platform Blueprint** is not a component gallery and not a clone of a design system. It is a working web app whose own pages are the experiments: navigation, layout, overlays, motion, responsiveness, accessibility, performance, and documentation are all implemented from platform primitives where practical.

## The question

**How far can a polished, accessible web application go without a component library or animation library?**

The project answers that question with a wireframe / technical-blueprint visual language: white space, graphite, restrained greys, construction lines, semantic labels, and live interactive specimens.

## Product shape

The app will be a real multipage experience rather than a single demo canvas:

- **Home** — semantic landing page with navigation, hero, content sections, and footer.
- **Library** — searchable grid of live components and layout specimens.
- **Workspace** — app shell with sidebar, sticky regions, dashboards, data states, and dense layouts.
- **Component detail** — isolated component behavior, fallbacks, and implementation notes.
- **Playground** — a small native Canvas experiment using pointer input and animation frames.
- **Preferences** — motion, contrast, density, and other user-facing settings.
- **Create** — arrange and test responsive wireframes from Blueprint patterns.

## Inspectable by design

Every meaningful component has a reference record:

- native HTML, CSS, and Web API primitives it uses;
- support tier: **Baseline**, **Progressive enhancement**, or **Lab**;
- fallback behavior;
- direct links to primary documentation and specifications;
- a concise explanation of the trade-off it demonstrates.

The interface offers three reading modes:

1. **Render** — the product as a normal application.
2. **Wireframe** — construction boundaries, spacing, and layout regions.
3. **Inspect** — select a component and open its persistent **Reference Dock**.

Hover or keyboard focus may reveal a short hint, but documentation is never hover-only. On desktop the Reference Dock is a persistent side panel; on small screens it becomes a bottom sheet or native dialog.

## Platform-first scope

### Foundation

Semantic HTML landmarks, forms, progressive enhancement, CSS Grid, Flexbox, custom properties, cascade layers, nesting, logical properties, `clamp()`, `minmax()`, `aspect-ratio`, media queries, and user preference media features.

### Modern production primitives

Container queries and container units, `:has()`, `subgrid`, `<dialog>`, Popover API, CSS anchor positioning, View Transitions, `@starting-style`, intrinsic-size transitions, Web Animations API, `content-visibility`, lazy loading, and observer APIs.

### Lab primitives

Scroll-driven animations, scroll-state container queries, anchored container queries, and other features that need capability detection and intentional fallbacks.

## Non-goals

- No UI framework, component kit, or animation library as the default solution.
- No fake compatibility claims: each feature documents its support tier and fallback.
- No “all features at once” implementation. Every addition must have a learning question and visible use in the app.

## Technical direction

- Vite + TypeScript.
- Static multi-page application first; JavaScript enhances rather than replaces usable HTML.
- Native CSS and browser APIs before dependencies.
- Tests and accessibility checks for behavior that matters.
- `prefers-reduced-motion`, keyboard navigation, focus handling, and contrast are product requirements.

## Status

The app includes seven static routes, a responsive component library, an interactive canvas and locally stored preferences. The **Render**, **Wireframe**, and **Inspect** controls appear on every page and retain the current mode as you navigate. On the Components page, choose **Inspect a specimen** to open the Reference Dock. Use its arrows to switch between the responsive card, native dialog, and layer shift without navigating. The dock sits beside the live page on desktop and opens as a modal sheet on narrow screens. Each record lists the semantic element, support tier, fallback, source, and documentation. Wireframe shows live grid tracks for the responsive card and Library grid. Open either grid’s reference in Inspect to see its measured width, tracks, and gaps. For the responsive card, the dock also shows the active layout and its breakpoint.

In the responsive card, native dialog, and layer-shift records, **Show fallback** lets you try the same layout, disclosure, or static state the app uses when an enhancement is unavailable or reduced motion applies. The dock explains which condition is active. On a phone, close the dock to try the specimen, then reopen it to change the simulation.

Library cards lead directly to live specimens or their research. Live links open the matching Reference Dock record. Use **Copy link** in the dock to share that specimen. Without JavaScript, the link still takes readers to the original section.

To add a shareable specimen, define its dock record in `src/inspect-records.ts` and map a stable ID to its page and record in `src/specimen-registry.ts`. Put that ID and `data-specimen-id` on the destination section, mark the highlight with `data-inspect-target`, and leave a `data-inspect-controls` container for the Inspect button. Use `<a data-specimen-link="your-id">` for Library or Home cards. Vite emits ordinary links from the registry in dev and production. For a local inspection target without a shareable URL, the wrapper can use `data-inspect-record` directly.

The original six routes include a chromatic aberration experiment using [HTML-in-Canvas](https://developer.chrome.com/docs/web-platform/html-in-canvas). Open the bottom-right control to adjust the RGB channel split (0 removes it), or choose **Use normal HTML** to restore ordinary DOM rendering. On supporting browsers, the whole page's real HTML is drawn into a canvas; unsupported browsers and rendering errors retain ordinary HTML. The effect redraws on demand. The only animation is a short glitch (shake, wider channel split and torn rows) when following a link to another page of the app, which settles on arrival. Reduced motion, from the system or the Preferences page, skips it. Browser interaction, accessibility, and performance on long pages still need browser verification. The implementation targets the current `content="drawable"` / `drawable` API rather than the older `layoutsubtree` prototype.

This expands the Playground scope of [issue #5](https://github.com/josuecm13/web-platform-blueprint/issues/5) to the whole page at the project owner's request. It does not complete that issue's Reference Dock or browser verification requirements. See [implementation and validation notes](docs/html-in-canvas.md).

Workspace offers **Empty**, **Typical**, and **Crowded** datasets. Search or sort the activity table, change the project density in Preferences, and use Inspect to see how the overview grid and scrollable table handle the available space.

## Layout Studio

Open **Create** to arrange browser-native patterns on an interactive wireframe. Drag elements from the palette, move an existing element with its canvas handle, or use the add and move buttons. Switch to phone width to see grids reflow. Test scroll-driven rise, fade, and scale effects with a static fallback for unsupported browsers and reduced motion.

In **Workflow**, describe the UX philosophy and generate a reusable prompt for a sibling layout or the next step. Next-step layouts can be tested from the source action in the canvas. Layouts save locally.

## Run locally

Requires Node.js. Run `npm install`, then `npm run dev` for development or `npm run build` followed by `npm run preview` for a production preview.

Run `node --test tests/chromatic.test.mjs` for the canvas model tests. For the Inspect mode browser checks, run `npx playwright install chromium` and then `npm run test:browser`.

The application uses real HTML documents and ordinary links. Core content and navigation remain available without JavaScript; filtering, canvas interaction and preference persistence progressively enhance the experience.

Research: [platform catalog](docs/platform-catalog.md) and [CSS if() research](docs/css-if-research.md).
