# Program tree — clean edition

Open `tree.html` in your browser. This standalone folder contains the merged tool
with a single placeholder node, ready for your own data. No server or installation
is required to view it. The source branch folders remain separate.

## Populate with Copilot

Open this folder as the workspace and give Copilot your source material with:

> Read AGENTS.md and data/AGENTS.md. Generate data/tree-data.json from the attached
> source material, preserving the source hierarchy, project/workstream/action labels
> and explicit dependencies. Validate and regenerate the browser adapter using
> node scripts/sync-data.cjs, then run node --test tests/data.test.cjs. Report any
> missing or ambiguous source information.

`data/tree-data.json` is the editable source of truth. `data/tree-data.js` is its
generated browser adapter. After changing the JSON, run from this directory:

```powershell
node scripts/sync-data.cjs
node --test tests/data.test.cjs
```

These commands use Node.js built-ins with no npm dependencies. Reopen or reload
`tree.html` after generating the adapter. The data instructions include all fields,
allowed statuses, metadata requirements, ordering rules and a complete example.
Copilot also receives workspace guidance from `.github/copilot-instructions.md`.

## Using the tool

Double-click a node to focus its branch (ancestors and descendants remain visible).
Direct prerequisites and dependent nodes outside that branch stay visible in grey
with reduced opacity and muted dependency lines. They remain clickable; double-click
one to focus its branch. Unrelated nodes stay hidden.
Use **Show all branches** (eye button) to restore the full tree. Single-click selects
a node and opens its details. Choose **Edit tree** to edit, then **Done editing** to return to viewing. Project, Workstream and Related Action views,
branch focus, metadata highlighting, dependencies, stage gates, themes and layout
controls are retained. Metadata-based views become available once the data includes
source metadata. This clean edition uses one dataset; old branch datasets and the
branch-specific dataset selector are omitted.

Edits made in the browser last for the current page session. Use JSON export to
save them. To make an export the startup data, remove computed `_x`/`_y` fields,
replace `data/tree-data.json`, then run the sync command. Theme and spacing settings
are saved in browser local storage and may be shared with other copies of the tool.

## Files

- `tree.html`, `js/`, `styles/`, `images/`: standalone application and assets.
- `data/tree-data.json`: your program content.
- `data/tree-data.js`: generated static-file adapter.
- `AGENTS.md`, `data/AGENTS.md`: tool and data generation instructions.
- `scripts/sync-data.cjs`: data validation and generation.
- `tests/data.test.cjs`: source/adapter consistency and validator regression checks.

No old program content, spreadsheets, archives, backups, git history or development
dependencies are included. The original license is retained in `LICENSE`.

## Design framework

The interface combines the AI Usage tool’s TMBL colour scheme with the official
Porsche Design System v4.10.1 CSS variables and
Porsche Next font definitions, bundled locally under `styles/vendor/porsche-v4/`.
Native accessible controls and the SVG tree consume those tokens directly, following
Porsche's documented custom-component CSS approach. Porsche Web Components are not
loaded. Font Awesome provides all application and node icons. Legacy emoji or image
icon values display a Font Awesome diagram fallback without rewriting source data.

See `DESIGN_SYSTEM.md` for the component review, token mapping, motion/loading behavior,
source links and third-party notices. The original application license remains in
`LICENSE`; Porsche's separate code and assets license is retained at
`styles/vendor/porsche-v4/LICENSE.md`. `variables.css` is unmodified; the font-face
stylesheet changes only font URLs to local files. No Porsche crest or wordmark is used.

To run the optional browser regression check with Playwright in your development
environment, use `node tests/ui.browser.cjs`. Windows uses installed Edge; elsewhere
install Playwright Chromium or set `TREE_BROWSER_PATH`. This test dependency is not
needed to run the application. The check covers desktop/mobile layouts, theme,
loading completion, keyboard focus, editing, import feedback and branch focus.

Layout regression checks can be run with `node tests/layout.browser.cjs` using the
same Playwright setup. Automatic collision adjustments keep parent/descendant
columns together and preserve explicit manual-position overrides.

Display settings and their branching-style scope are documented in
[DISPLAY_SETTINGS.md](DISPLAY_SETTINGS.md). Inapplicable spacing sliders are disabled;
manual positions and pan/zoom are preserved while changing settings. Run
`node tests/settings.browser.cjs` for the full settings/view/layout regression matrix.


Focusing reflows only the visible branch, its ancestors and muted dependency context,
then fits those nodes on screen. **Show all branches** restores the original full
layout, manual positions and pan/zoom. Dragging or resetting positions while focused
changes only that temporary layout. Content edits and display preferences still
apply to the tree; the full layout recalculates for those changes when focus clears.


In focus, grey prerequisites sit above-right of their target and grey downstream
nodes below-right of their source. The original direct dashed connections show the dependency direction.
Shared dependencies appear once, with links to each related visible node.

The node icon field offers autocomplete from the locally bundled Font Awesome icons
and an **Icon library** link for browsing. Suggestions work offline; the external
library opens in a new tab.
