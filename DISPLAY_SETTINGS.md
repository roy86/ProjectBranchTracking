# Display settings audit

Checked all display controls in Project, Workstream and Related Action views, using
even, vertical, horizontal-right, horizontal-left and mixed attachment layouts:
15 view/layout combinations. Current program data and dependency-focus regressions
were checked separately.

| Setting | Expected effect | Applicability |
| --- | --- | --- |
| Auto / Light / Dark | Update canvas, controls, tree, borders and selected-node details. Auto follows operating-system changes; explicit themes stay fixed. | All layouts |
| Line thickness | Scale hierarchy and dependency strokes together, including selected/highlighted/context edges. | All layouts |
| Node border | Scale ordinary, selected and highlighted outlines. Keyboard focus uses the same border and glow, without another ring. | All layouts |
| Stacked sibling gap | Increase/decrease the clear gap between stacked sibling subtrees. | Vertical or sideways stacks with multiple children; also separation between mixed even and vertical buckets |
| Side-branch gap | Increase/decrease the horizontal clearance between the parent footprint and a left/right child column. | Horizontal-left / horizontal-right |
| Downward level spacing | Scale the parent-to-first-child spacing below a parent, consistently for even and vertical modes. A minimum footprint clearance protects labels at compact values. | Even / vertical; includes generated grouping rows |
| Side-branch drop angle | Adjust the first sideways child's downward angle. At zero degrees it is level with the parent; subsequent siblings remain in the same column. | Horizontal-left / horizontal-right |
| Reset defaults | Restore all setting values, theme and CSS scales; save defaults. | All layouts; preserve manual node positions and pan/zoom |

Inapplicable spacing controls are disabled for the visible hierarchy, with persistent
scope descriptions. They update when the view, focus, hierarchy or attachment mode
changes. Manual position overrides remain fixed when spacing sliders change. Live
settings preserve the camera so slider effects are not hidden by automatic fitting.

## Corrections

- Sideways siblings previously used individual label widths to choose their x
  coordinate. Both sides now share a column based on the widest child subtree.
- Side-branch clearance now includes the parent's own footprint, preventing overlap
  at the smallest gap setting.
- Vertical first-child spacing now matches even-row centre spacing instead of adding
  an extra child radius; both respect a minimum label/circle clearance.
- Selected details refresh after layout or theme changes, including popup placement
  and stage/status colours.
- Keyboard focus uses the existing border/glow treatment with proportional
  sizing, so the border slider stays effective without adding a separate circle.
- Saved settings are type-checked, clamped to each slider's bounds and snapped to its
  step. Invalid appearance values and corrupt storage safely use defaults.

## Regression commands

With the existing Playwright development setup (Edge on Windows):

```powershell
node tests/settings.browser.cjs
node tests/layout.browser.cjs
node tests/focus.browser.cjs
node tests/ui.browser.cjs
node --test tests/data.test.cjs
```

The settings check measures actual rendered stroke widths and node coordinates at
slider limits, including mixed layouts. It also checks theme/system changes,
applicability, popup movement, camera/manual positions, persistence, reset and
malformed saved values. The layout and focus suites preserve column alignment and
muted external dependency context. Data files are not modified by these checks.
