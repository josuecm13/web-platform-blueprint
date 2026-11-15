# Blueprint design language

Blueprint is a field guide whose screens demonstrate the platform. Layout Studio uses the same visual grammar for editable experiments.

| Existing reference | Design choice | Studio application |
| --- | --- | --- |
| [Home](../index.html) and [Library](../library/index.html) | Warm paper, graphite, thin rules, and a generous shared masthead. The Library lets the specimens supply the visual detail. | Keep the shared masthead and use paper for the editor. Separate panels with thin rules and reserve accent color for interaction. |
| [Workspace](../workspace/index.html) | A forest-green introduction with construction lines, an italic serif accent, and restrained light panels for dense controls. | Share the field introduction style. Keep the introduction compact so the palette and canvas begin near the top of the page. |
| [Components](../components/index.html) | Grids, construction axes, translucent planes, and high-contrast mint highlights show how specimens are assembled. | Use the same construction vocabulary on the stage. Use abstract shapes for regions and color the selection and insertion indicators green. |
| [Reference Dock](../src/inspect.css) | Deep graphite-green frames technical material. Mint marks selected modes, focused actions, and links. Monospace distinguishes source and measurements. | Reuse the existing mode toolbar and dock. Use monospace for canvas dimensions, scroll readings, and the workflow prompt. Use the dark surface for prompt text and keep its form on paper. |

## Applying the choices

The shared `--field-*` colors and `.field-intro` live in [style.css](../src/style.css). The canvas inherits these colors across its shadow boundary.

- Use the shared Inter and system sans stack for prose and controls. Reserve the serif accent for a display heading and monospace for measurements or source.
- Put geometry where it explains something. Use construction lines on the stage, dashed lines for drop targets and wireframes, and solid outlines for selection. Preserve visible keyboard focus when state also uses color.
- Keep samples abstract. Text lines, media rectangles, and neutral interaction labels let readers judge hierarchy and behavior without supplied copy or imagery.
- Use light borders for separation. Use shadow where it communicates a raised surface, such as the canvas frame or a dragged element.
- Check the editor and specimen at narrow and wide widths. Preserve the project’s static preview and reduced-motion paths.

## Applying the same language to Topology

Start with a warm paper ground plane, graphite edges, and the existing construction grid. **Structure** can raise rectangles by nesting and use green to trace the selected branch. A future **Stacking** view should key depth to paint order and give overlays a distinct elevation. A single light and a restrained shadow should make relative depth readable. Keep depth, selection, and camera controls alongside the existing modes, and provide a flat view for precise selection and reduced motion.

The layered plates on [Components](../components/index.html) are the closest existing visual reference for the projection.
