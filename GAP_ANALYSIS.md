# Branch gap analysis and merge

Final application: `ProjectBranchTracking-BenVersion/ProjectBranchTracking/tree.html`.
BenVersion remains the implementation base. AlecVersion is retained unchanged as a reference.

## Findings

Compared the entry HTML, runtime JavaScript, CSS and design tokens, data scripts,
images, bundled icon libraries, and documentation in both supplied folders.
Alec has no exclusive runtime controls or algorithms: its JavaScript and UI are
an earlier subset of Ben's. Replacing Ben's runtime with Alec's would lose features.

| Capability | AlecVersion | BenVersion / merged result |
| --- | --- | --- |
| Pan, zoom, fit all / fit width, node selection | Present | Retained |
| View/edit gating, title editing, node CRUD | Present | Retained |
| Drag positioning, reparenting, parent-cycle prevention | Present | Retained |
| Dependencies, reverse dependencies, hover arrows, searchable editor | Present | Retained |
| ETA and Discover / Design / Approve / Build / Test stage statuses | Present | Retained |
| Per-node child layout and attachment overrides | Present | Retained |
| Emoji, image, Font Awesome icons and dark-theme image inversion | Present | Retained |
| Theme, line/border/spacing/angle settings and JSON import/export | Present | Retained |
| Project, Workstream and Related Action views | Absent | Retained from Ben |
| Metadata editing, explicit group ordering, per-view positions | Absent | Retained from Ben |
| Context-sensitive metadata highlighting, branch focus, rich hover tooltip | Absent | Retained from Ben |
| Header Cancel and restored selection after editing | Absent | Retained from Ben |
| DDB delivery dataset | Absent | Kept as default: 77 nodes, one root |
| AI Strategy Pillars dataset | Present | Added as selectable dataset: 33 nodes, two roots |

The Alec data header describes eight pillars, but the supplied file contains only
Member Experience and Lending & Credit roots. The merge preserves the actual
33 nodes exactly; it does not invent the six missing pillars. Neither active source
dataset currently defines dependency edges; the dependency feature remains available.
Tokens, images, bundled icon libraries, license, README and the common historical data
backup are identical. Ben's additional data snapshots and workbook remain in place;
they are supporting source artifacts, not additional runtime features.

## Changes

- Added `data/ai-strategy-data.js`, containing Alec's complete supplied tree under
  `window.TREE_DATASETS.aiStrategy`. Ben's `data/tree-data.js` stays unchanged.
- Added Settings > Program dataset, with DDB delivery selected initially.
- Switching keeps each dataset's edited nodes, title, JSON imports and manual positions
  independently in memory, and resets transient selection, highlighting, focus and view.
- Metadata-based views are disabled when a tree has no source metadata. Adding metadata
  through the existing node editor enables these views; a dataset opens in Project view.
- Existing static-file loading is retained: no backend, fetch, build or CDN is needed.

Edits are session-only, as in the original application. Export JSON before refreshing
or closing the tab. JSON export and import operate on the selected dataset only.
Theme and layout settings continue to be shared across datasets.

## Validation

`tests/merge.test.cjs` runs the actual `file://` application in headless Edge on Windows
(or Playwright Chromium elsewhere). It checks source-node preservation, all three Ben
views, highlight/focus reset, metadata view availability, view/edit gating, node editing,
layout overrides, JSON import/export, independent dataset edits and positions, node
creation/deletion with dependencies, re-layout, finite positions and browser exceptions.
It also verifies that reloading restores the default Ben dataset.

Run from the application directory with Node.js and Playwright available:

```powershell
node --check js/app.js
node --test --test-isolation=none tests/merge.test.cjs
```

Install Playwright in your development environment if needed (`npm install --no-save
playwright`). Windows tests use installed Microsoft Edge. Other platforms need
`npx playwright install chromium`, or set `TREE_BROWSER_PATH` to a Chromium executable.

