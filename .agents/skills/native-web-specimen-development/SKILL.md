---
name: native-web-specimen-development
description: "Implement or change a live specimen in Web Platform Blueprint. Use for native HTML, CSS, or browser API demos, progressive enhancement and fallback controls, and changes to a specimen's Reference Dock record, Library entry, or shareable URL."
---

# Native Web Specimen Development

## Choose the behavior

1. Read the issue, the specimen's markup and styles, and its nearest existing implementation. Use [the platform catalog](../../../docs/platform-catalog.md) for the design intent and check primary browser documentation for the exact feature or syntax being introduced.
2. Define what the visitor can see or do in both the enhanced and fallback paths. Start with semantic HTML and CSS. Use TypeScript for state, feature detection, or browser API coordination. Fit the specimen into the existing Vite multipage app and reuse its controls and styles.
3. Use the same fallback path for feature detection and any explicit **Show fallback** control. Keep browser support, motion preferences, and user simulation distinct. Turning off a simulation must leave actual capability and preference checks in effect.

## Connect the live specimen

- Define the Reference Dock record in `src/inspect-records.ts`. Include the semantic element, primitives, support tier, why the technique is useful, actual fallback, a representative source excerpt, and primary documentation links. Update the record when implementation behavior changes.
- Follow the wiring present on the branch. Use `data-inspect-target` on the part to highlight and a `data-inspect-controls` container for the Inspect action. For a local inspection target, use `data-inspect-record` on its wrapper.
- When `src/specimen-registry.ts` is present, use its existing page and record mapping for shareable specimens. Give the destination section a stable HTML ID matching the registry, add `data-specimen-id`, and point the Library entry at it with `data-specimen-link`. Preserve ordinary anchor navigation without JavaScript and existing shared URLs.

## Verify the implementation

- Run `npm run build` and the relevant tests in `tests/browser/` through `npm run test:browser`. Exercise the enhanced path and any changed fallback. Check the relevant keyboard, focus return, touch, reduced-motion, and no-JavaScript behavior. Report which paths were actually exercised.
- For shareable specimens, open the link directly in a fresh session and confirm that the section and, when enabled, its Reference Dock record match. Follow [the repository's PR instructions](../../../AGENTS.md) when opening a pull request.
