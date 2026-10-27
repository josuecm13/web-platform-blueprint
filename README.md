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

Planning and research. The initial issues establish the browser-feature catalog, the semantic app shell, and the first version of the Inspect / Reference Dock experience.
