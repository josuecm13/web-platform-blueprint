# CSS if(): research and candidate use cases

Research snapshot: 2026-10-26. These are design hypotheses for Web Platform Blueprint, not implemented features or tested compatibility claims. [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/if) describes if() as experimental and not Baseline. Test exact syntax across browsers.

## What it does

if() selects a CSS property value using style(), media(), or supports() conditions. Branches are evaluated in order; the first true branch wins. A final else supplies a default. It can select part of a property value, and style() can inspect a custom property on the same element. It does not replace JavaScript business logic, event handling, semantic HTML, or container size queries.

## Candidate specimens

1. **Library card density:** --density selects padding and gap. Controls can set a class or inherited variable; cards remain readable without if().
2. **Feature support badge:** --support controls border style and tone for Baseline, enhancement, or lab. Include a textual label; never use color as the only indicator.
3. **Inspect mode:** a root setting inherited as --view-mode adjusts outline width or background for inspectable regions. Explicit CSS selectors supply the fallback.
4. **Motion preferences:** media(prefers-reduced-motion: reduce) selects a duration. Also honor an explicit app preference through a separate state and provide non-animated defaults.
5. **Touch target spacing:** media(pointer: coarse) chooses a larger spacing or minimum size; all controls should remain operable on hybrid devices.
6. **Print reference sheet:** media(print) selects a white background or suppresses decorative elements while keeping references readable. Use @media print for multiple declarations.
7. **Supported color format:** supports(color: oklch(...)) selects an enhanced color and otherwise an sRGB color. Browser support for if() itself requires an independent fallback.
8. **Data-driven layout experiment:** typed attr() plus style range conditions can adjust grid span based on a data attribute. Both features need separate support checks; keep a simple grid as fallback. See [Chrome 142](https://developer.chrome.com/blog/new-in-chrome-142).
9. **Nested condition experiment:** combine custom-property state and media preference in a value to illustrate condition ordering; compare readability with ordinary selectors and media rules.
10. **Reference dock:** density and panel position can vary by explicit state, while content and links remain available with plain CSS.

## Minimal example: card density

```css
.card {
  --density: comfortable;
  padding: 1rem;
  padding: if(style(--density: compact): 0.5rem; else: 1rem);
}
.card[data-density="compact"] { --density: compact; }

/* A conventional fallback also preserves compact behavior without if(). */
@supports not (padding: if(style(--density: compact): 0.5rem; else: 1rem)) {
  .card[data-density="compact"] { padding: 0.5rem; }
}
```

This is a research example, not browser-tested code. A supporting browser whose branch does not match receives else; a browser that cannot parse if() uses the earlier declaration or explicit fallback.

## Limits and evaluation

- if() chooses a value, not a block of declarations. For many properties, @media, @container, or selectors may be clearer.
- style() conditions inspect custom properties; container queries are still the right tool for parent dimensions.
- Do not assume support for if(), range comparisons and typed attr() is identical.
- Test valid, missing and unknown states, first-true ordering, no else, invalid values, inheritance and fallback behavior.
- Benchmark and inspect maintainability before applying complex nested conditionals throughout the project.
- Do not hide essential content or accessibility information behind an experimental feature.

Sources: [MDN if()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/if), [Chrome CSS conditionals](https://developer.chrome.com/blog/if-article), [advanced attr()](https://developer.chrome.com/blog/advanced-attr).
