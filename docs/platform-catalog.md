# Web platform research and capability catalog

Research started: 2026-10-26. Status: initial survey; browser compatibility and accessibility must be verified feature by feature before implementation.

## Research question

How can a complete, inspectable multi-page application use the browser's native HTML, CSS and Web APIs to implement modern interfaces, from foundational patterns to experimental 2026 features?

Native-first means using platform features when appropriate, not avoiding JavaScript: canvas, persistence, filtering and complex interaction may need it.

## Support vocabulary

- **Foundation**: established primitives for the core experience.
- **Enhancement**: progressively adds behavior or presentation; the underlying feature remains usable without it.
- **Lab**: a specimen for investigating a feature with uncertain or limited support. Never required for core navigation or reading.

These are project decisions, not official Baseline designations. Baseline Newly available means support in the core browser set; Widely available adds 30 months. It does not guarantee older browsers or every subfeature. Record browser versions, verification date, and the exact syntax tested before shipping. See [Baseline](https://web.dev/baseline) and [Baseline 2026](https://web.dev/baseline/2026).

## Six-page minimum

| Page | Real application experience | Research focus |
| --- | --- | --- |
| Home | Navigation, hero, sections, footer | Semantics, responsive page layout, fluid sizing, navigation transitions |
| Library | Searchable cards and filters | Grid, subgrid, container queries, content visibility, form controls |
| Workspace | Sidebar, dashboard, table, cards | App shell, sticky regions, scroll containers, density and overflow |
| Component detail | Live specimen, controls, code and references | Dialog, popover, anchor positioning, native state and feature detection |
| Playground | Small canvas with controls and accessible alternative | Canvas 2D, pointer events, animation frames, resize and cleanup |
| Preferences | Motion, contrast, density, persisted settings | Preference media queries, forms, local storage, tokens |

These are planned pages, not implemented routes. Component detail may have multiple URLs; the six categories above establish the minimum. The reference dock and Render/Wireframe/Inspect controls are shared across pages.

## Capability catalog

| Capability | Approach and placement | Tier | Fallback | Primary reference |
| --- | --- | --- | --- | --- |
| Semantic landmarks | header/nav/main/section/article/aside/footer; all pages | Foundation | Native HTML itself; label repeated landmarks and use appropriate headings | [HTML elements](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements) |
| Responsive page | Grid/Flexbox, media queries, minmax(), clamp(); home and shell | Foundation | Single-column layout | [Media queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries) |
| Component responsiveness | Container size queries and container units; library cards | Foundation | Readable stacked card | [Container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries) |
| Container style queries | Change child presentation based on a container custom property; workspace | Enhancement | Default card styling | [Size and style queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_size_and_style_queries) |
| Scroll-state queries | Sticky header or snapped item state; workspace | Lab | Static sticky styling | [Scroll-state queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Conditional_rules/Container_scroll-state_queries) |
| Cascade and scope | @layer, nesting, @scope to organize stylesheet ownership | Enhancement | Conventional scoped selectors where needed | [Cascade layers](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@layer), [@scope](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@scope) |
| Aligned cards | subgrid for title/body/actions; library | Enhancement | Independent grid rows | [Subgrid](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Subgrid) |
| Relational state | :has() for form/card state | Enhancement | Explicit class or simpler selector | [:has()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:has) |
| Native disclosure | details/summary for reference notes | Foundation | Native disclosure | [details](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/details) |
| Dialogs | dialog.showModal(), focus and Escape; component detail and mobile dock | Foundation | Dedicated inline content or page link if dialog unavailable | [dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) |
| Popovers | popovertarget for a non-modal action panel | Enhancement | Always-available inline links or disclosure | [Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) |
| Anchor positioning | Position reference hint relative to its trigger | Enhancement | Inline or fixed-position panel; no lost content | [Anchor positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Anchor_positioning/Using) |
| Invoker commands | commandfor and command for declarative dialog controls | Lab | Button listener calling showModal()/close() | [Invoker Commands](https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API) |
| Customizable select | Native select with enhanced picker; preferences | Lab | Ordinary select, carefully test HTML parsing and support | [Customizable select](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Customizable_select) |
| Forms | labels, validation, fieldset, output, progress and meter | Foundation | Server-side or JS validation when applicable; semantic controls remain usable | [Forms](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms) |
| field-sizing | Content-sized textarea in preferences | Enhancement | Fixed minimum height and manual resize | [field-sizing](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/field-sizing) |
| Same-document transitions | Animate selected card to detail state | Enhancement | Immediate state change | [View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API) |
| Cross-document transitions | Navigation between actual pages | Enhancement | Normal navigation | [@view-transition](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@view-transition) |
| Entry/exit motion | @starting-style and transition-behavior | Enhancement | Immediate open/close | [@starting-style](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@starting-style) |
| Intrinsic sizing animation | interpolate-size for disclosure | Enhancement | Instant size change | [interpolate-size](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/interpolate-size) |
| Scroll-driven animation | Progress indicator and specimen reveal | Lab | Static, fully visible content | [Scroll-driven animations](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations) |
| Canvas and pointer | Small 2D layout board | Foundation | Text description and equivalent keyboard-operable controls | [Canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API), [Pointer events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) |
| Rendering performance | content-visibility and contain-intrinsic-size for long lists | Enhancement | Render normally; measure layout shifts and interaction | [content-visibility](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/content-visibility) |
| Observers | ResizeObserver for canvas; IntersectionObserver when needed | Enhancement | Initial rendering or manual refresh; clean up observers | [ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver), [IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) |
| Reduced motion | prefers-reduced-motion and app preference | Foundation | Static states; animation never conveys the only information | [prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion) |

## First 12 specimens

1. Semantic responsive app shell — Home.
2. Adaptive card — Library, container size query.
3. Aligned card grid — Library, subgrid.
4. Native disclosure — Component detail, details/summary.
5. Non-modal menu — Component detail, Popover API.
6. Modal dialog — Component detail, focus management and Escape.
7. Anchored hint — Reference Dock, anchor positioning with fallback.
8. Form states — Preferences, validation and :has().
9. Card-to-detail transition — Library, same-document view transition.
10. Scroll progress — Workspace, scroll-driven animation with static fallback.
11. Large card list — Library, content-visibility and measured behavior.
12. Interactive canvas — Playground, Pointer Events and keyboard alternative.

## Reference Dock design research

A global Inspect toggle reveals selectable component boundaries and their names. Selection opens persistent documentation; hover/focus is a short hint only. Desktop uses a collapsible side dock; narrow screens use an accessible dialog or sheet with a deliberate close control and restored focus. Do not make interactive links into tooltip content.

Each record includes component identifier, semantic element, native primitives, exact support status, tested browser versions and date, fallback, explanation, source links and relevant code. An unsupported feature must not prevent opening its reference.

References: [WAI tooltip pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/), [WAI modal dialog example](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/dialog/).

## Further research before implementation

- Test actual support for each exact syntax in Chrome, Firefox and Safari, including mobile; Baseline labels apply to specific features, not every related syntax.
- Decide supported browser versions and record the decision.
- Prototype dock keyboard and touch behavior before choosing popover versus dialog.
- Measure layout shifts and rendering cost on a realistically large library.
- Test zoom, contrast, keyboard, screen readers, reduced motion and JavaScript-disabled navigation.
- Investigate View Transition behavior across pages and hosting requirements for static routes.
- Expand this survey with primary specifications and working examples; this document is not yet an exhaustive compatibility matrix.
