# Agent instructions

This is a standalone static program tree tool, based on the merged BenVersion.
Open `tree.html` directly in a browser. There is no backend or build dependency.

## Populating the tool

Read `data/AGENTS.md` before generating or editing program data. It defines the
JSON contract, hierarchy and metadata rules, and a complete example.

1. Use the user's supplied source material to create `data/tree-data.json`.
2. Run `node scripts/sync-data.cjs` from this folder. This validates the JSON and
   generates `data/tree-data.js`, which the browser loads directly.
3. Run `node --test tests/data.test.cjs` and open `tree.html` to check the result.

Treat JSON as the source of truth. Never edit the generated JS independently.
Do not invent projects, milestones, completion statuses, dates or dependencies.
Ask for missing source material when it prevents creating a faithful tree.
The initial single PROGRAM node is a placeholder to replace, not real program data.

Keep tool features intact: Project/Workstream/Related Action views, highlight and
branch focus, editing, dependency links, stage statuses, node layout overrides,
JSON import/export, themes and spacing controls. Data generation normally requires
no changes to HTML, CSS or runtime JavaScript.

Keep the app compatible with direct file URLs; do not replace the JS data adapter
with fetch-only JSON loading. Keep local icon libraries, logo and theme assets.
Node ids must remain stable between data refreshes. Do not generate computed
coordinates or virtual group nodes. Runtime edits are in memory; exporting JSON
and replacing the source file is how users save changes between sessions.


## Interface framework

Use Porsche Design System v4.10.1 via the official locally bundled CSS variables.
Read `DESIGN_SYSTEM.md` before changing styles. Consume `--p-*` values; do not redefine
design-system-owned tokens or reintroduce another visual framework. Maintain the
native-control/custom-SVG integration and direct file URL compatibility. Use bundled
Font Awesome icons for every new UI or node icon. Keep monospace confined to JSON,
numbers tabular, layouts responsive and reduced-motion preferences respected.
Preserve visible focus, dialog focus management, operation loading and error feedback.

The header brand mark must use the supplied `images/logo.png` unchanged, with
Teachers Mutual Bank Limited alt text. This brand asset is separate from UI icons.
Keep its aspect ratio and white backing so it remains legible in both themes.

Use the TMBL colour scheme shared with AI Usage, recorded in
`styles/brand-palette.json` and mapped in `styles/tokens.css`. Keep the app-owned
colour aliases; do not replace them with Porsche default blue/black colour roles.

Focused layout is transient: lay out only visible hierarchy/dependency-context nodes,
and keep the full view's manual positions and camera restoration point separate.
Never save focus-only dragging or reset positions into the full view's position store.
Regression coverage is in `tests/focus-layout.browser.cjs`.

External dependency context belongs near its related focused node: prerequisites
above-right, downstream dependents below-right, with collision-free label footprints
and the original direct edge-to-edge dependency connectors. Keep shared context nodes unique and preserve
the full-layout restoration behavior. See `tests/dependency-placement.browser.cjs`.

The header must remain one flat toolbar with uniform gaps and shared control sizing.
Use one primary edit-mode action, a common secondary style, and no empty tool-group
wrappers or auto margins. Mobile rows fill the available width without shrinking
control height or typography.
