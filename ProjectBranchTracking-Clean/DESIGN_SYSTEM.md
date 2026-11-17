# Porsche v4 interface review

## Integration

Pinned source: `@porsche-design-system/components-js@4.10.1` from the npm registry.
The official `stylesheets/variables.css` is bundled unchanged. Its companion
`font-face.css` is bundled with font URLs redirected to local, unchanged WOFF2 files.
The package's code and asset license is retained beside these files. The application
uses the supplied `images/logo.png` as its header brand mark, preserving its aspect
ratio and original colours on a white backing in both themes. It keeps its own identity; no Porsche crest, wordmark, photography or product assets are used.

This uses Porsche's documented pure-CSS/custom-component integration. It is not a
Web Components integration: controls are native HTML, while the domain-specific tree
uses SVG. That keeps direct `file://` loading, offline use and Font Awesome icons.
Porsche spacing, typography, radii and motion are consumed through official tokens.
The colour roles in `styles/tokens.css` use the TMBL palette shared with AI Usage;
vendor `--p-*` variables remain unchanged. Theme uses CSS
`color-scheme` and the existing data-theme attribute together.

Official references:

- [CSS variables and custom components](https://designsystem.porsche.com/v4/stylesheets/css-variables/introduction/)
- [Font definitions](https://designsystem.porsche.com/v4/stylesheets/font-face/)
- [Button hierarchy](https://designsystem.porsche.com/v4/components/button/usage/)
- [Accessibility](https://designsystem.porsche.com/v4/must-know/accessibility/)

## Element and layout decisions

| Requested review | Implemented behavior |
| --- | --- |
| Delete filler badges | Status appears as plain text; stage progress is a readable list rather than decorative chips. Only meaningful node-status legend entries remain. |
| Drop redundant labels | One Save action in the editor; highlight selector label remains available to assistive technology without repeating its heading. Relationship names are not repeated in each link. |
| Remove arbitrary italics | All interface text uses normal style. Icons use Font Awesome SVGs, not italic text glyphs. |
| Mono only where needed | Only the JSON editor uses monospace. Settings values and zoom use the UI font. |
| Match the framework | Official typography, spacing, radii, motion and shadows drive custom controls, with the AI Usage TMBL brand colours. |
| Group with spacing | The header uses one flat toolbar; form sections and settings groups use consistent gaps; decorative dividers and boxes are avoided. |
| Specific headlines | Display settings, Add/Edit node, Rename program, Highlight workstream/project, and the data-driven program title describe their content. |
| Emphasize the CTA | Edit tree / Done editing is the single header primary action; Add node and utility controls are secondary. Save, Apply data and Focus branch are primary within their own context. |
| Appropriate colors | TMBL navy/slate text, warm-neutral surfaces and magenta primary actions/selection; cyan and plum support relationships. Green success and orange exploration keep status meanings clear. |
| Font Awesome icons | Every application and canvas icon uses the bundled library. Legacy node icons receive a diagram fallback without changing stored data. |
| Remove embellishments | No background image, gradient, dot grid, hover glow, frosted panels, dashed logo box or hazard-stripe editing frame. Selected nodes use a restrained glow on their existing border. |
| Wrap content | Header titles wrap; controls flow onto additional rows. Dialogs/panels fit narrow screens. Node labels wrap to three lines, with full titles in accessible labels and details. |
| Optical alignment | Icons have a consistent visual size; text baselines, field spacing and close controls were visually reviewed in rendered desktop/mobile views. |
| Tabular numbers | Enabled for zoom, settings and other interface numerals. |
| Loading states | Initial fonts/layout and data apply/view/layout/clipboard operations have visible live status. Work yields for a paint before execution; controls prevent repeated submission. |
| Useful motion | Short panel/notification fades, focus and hover feedback. Reduced-motion preferences disable animations and transitions. |

## Accessibility and interaction

- Keyboard-operable SVG nodes: Enter/Space opens details; Shift+Enter focuses a branch.
- Double-click branch focus, single-click selection, drag, zoom and existing view/edit gating remain.
- Dialogs have names, focus containment and focus return. Background controls are inert while a dialog is open.
- Fields and icon buttons have programmatic names; theme choices expose pressed state.
- Errors use a live notification and leave the form/data available for correction.
- Header height is measured for tree fitting and panel placement; it can grow when content wraps.
- The editor scrolls its fields independently, keeping Cancel, Delete and Save visible.
- Source data remains unchanged by this visual migration.

## Verification

`node --test tests/data.test.cjs`: 12 data/contract checks.
`node tests/ui.browser.cjs`: actual headless Edge file URL, local fonts, all views,
branch focus, editing, invalid JSON/cycle feedback, light/dark modes, responsive
controls at 320/390/768/1024/1440 px, mobile Save visibility, dialog focus and reduced motion.
No browser page exceptions in the completed check. Screenshots were visually reviewed
in light/dark desktop, mobile canvas and mobile editor states.


## Shared AI Usage colour scheme

Source: the sibling `ai-usage` tool's `report/theme.json`, `theme.css` and final
`refinement.css` colour roles. `styles/brand-palette.json` records the copied palette.
Core swatches: navy #22364e, slate #44546a, magenta #b82a57, plum #7e1b5b,
cyan #49b7c5, orange #eb802d, grey #998f8f, warm grey #e9e7e3, white and black.
Light panels are white on #f5f4f2; dark panels are #101923 on #1b2939.
Primary buttons are magenta with white text, with plum hover. Active/focus colours
use magenta in light mode and #f295b2 in dark mode, matching the AI Usage refinement.
Pale magenta selection surfaces use #f8e9ee / #4b2031. Orange is darkened for small
light-theme status text to maintain contrast. Standard semantic success green is kept.
The supplied logo, Font Awesome icons, Porsche typography and layout are unchanged.


## Dependency context during branch focus

Focus retains the selected subtree and its ancestors at full emphasis. Direct
prerequisites and dependents of nodes in that subtree are also visible, with
42% opacity and grayscale styling. Their dashed dependency edges are neutral grey.
Hover/keyboard focus raises context opacity to 68% for inspection. External context
nodes remain selectable, and their details identify them as outside the focused
branch; users can double-click them to change focus. When external dependencies are
present, focus fits all visible nodes so that relationship context starts on screen.

Unrelated nodes remain hidden. Ancestors' unrelated relationships, neighbors of
context nodes and context nodes' children are not recursively added. The same logic
uses active canonical node IDs across Project, Workstream and Related Action views.
Metadata highlighting cannot override dependency-context styling. Clearing or
changing focus/view rebuilds the context set without changing the dataset.

`node tests/focus.browser.cjs` checks prerequisites and reverse dependents, internal
edges, hidden unrelated/indirect nodes, opacity/filter, edge rendering, selecting and
refocusing contextual nodes, highlight coexistence, reset and all three view modes.

## Display settings consistency

See `DISPLAY_SETTINGS.md` for the per-setting scope and completed 15-case view/layout
audit. Left/right siblings use a shared column, and both downward styles share their
first-child spacing rule. Inapplicable spacing controls are disabled with help text.
Spacing and theme changes refresh selected-node details while preserving camera and
manual positions. Keyboard focus emphasizes the existing node border; saved values are
validated against slider bounds and steps. Regression: `node tests/settings.browser.cjs`.


## Focused layout and restoration

Focused auto-layout uses only visible nodes and visible parent/child links. Hidden
siblings do not reserve width/height; external dependency nodes are placed in
local context slots beside the focused nodes they relate to. A single visible downward child is centred
under its parent, including when its own subtree branches to one side.

The full view's coordinates, manual position store and camera are preserved before
entering focus. Focus uses a separate in-memory position store for drag/reset actions.
Refocusing keeps the first full-view restoration point. Clearing focus restores the
full layout and camera; content/spacing changes made during focus trigger a fresh full
layout instead of restoring stale coordinates. Changing view or importing data drops
the old focus snapshot. No focused positions are written into source position stores.

`node tests/focus-layout.browser.cjs` checks actual-data compaction and restoration,
all four branch styles in all three views, grey dependency context, temporary dragging
and reset, repeated focus, spacing changes and view switching.


## Local dependency positioning

Muted external prerequisite nodes are placed above-right of the focused target;
external downstream dependents are placed below-right of their focused source.
Placement reserves label/circle footprints, searches nearby free slots and leaves
the core focused hierarchy unchanged. Context nodes are not laid out as unrelated
roots or linked through their hidden canonical parents. Shared nodes render once,
anchored above their earliest target or below their latest source; every visible
relationship is retained. If a shared node has both roles, the first connected
anchor determines its position while arrow direction distinguishes its other links.

Context edges retain the original direct edge-to-edge dashed dependency lines, with
persistent arrows from prerequisite to dependent. Hierarchy connections retain
their original curved/straight routes. Node placement does not change line routing.
Dragging a focused node updates its contextual neighbors; a manually dragged context
node keeps its temporary override. All positions revert with the existing unfocus
restoration. `node tests/dependency-placement.browser.cjs` verifies direction,
collision avoidance, shared nodes, routing and stable core/full layouts in all views
and branch styles.


Node selection uses a 1.8× weight on the existing status border, full border opacity
and a subtle colour-matched glow. It adds no selection circle; status colour/dash
and the border-thickness setting are preserved. Keyboard focus uses that same border/glow treatment, with no extra circle.
Metadata highlight circles are also suppressed on the selected node.


## Header toolbar consistency

The toolbar is a flat list with one 8px gap between adjacent visible controls. There
are no nested tool groups, group margins or auto margins that leave empty gaps when
edit/focus actions are hidden. Dropdown and action controls share 48px height, 4px
corners, 1px borders and the same UI text size. Utility icons share 18px artwork in
48px targets. All secondary actions use one outline style; Edit tree / Done editing
is the single magenta primary action in either mode. Active highlighting is a state
of its existing control. The toolbar wraps with the same spacing on narrow screens.
Settings/highlight controls expose expanded state and their associated panel.
