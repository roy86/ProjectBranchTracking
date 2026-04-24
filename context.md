# Project Context: AI Programs Tree

## What This Project Is

This project is a single-page interactive tree visualizer for planning and communicating an AI program of work.
It is inspired by the visual style of the Up tree concept and adapted for enterprise strategy mapping.

The app is designed to:
- show hierarchical AI initiatives and sub-initiatives
- show cross-stream dependencies between nodes
- support read-only stakeholder viewing and controlled edit mode
- keep styling/theme behavior easy to customize

Primary entry file:
- `ai-programs-tree.html`

Static assets/config:
- `styles/tokens.css` (theme + color + tuning tokens)
- `styles/tree.css` (UI/component styling)
- `js/app.js` (all runtime behavior/rendering)
- `data/tree-data.js` (source-of-truth tree content via `window.TREE_DATA`)
- `images/` (logo and node image assets)

---

## Product Behavior and UX Model

### Core UI Regions
- **Fullscreen SVG canvas** for tree nodes and connectors
- **Top bar** with centered title, left logo slot, and right icon action buttons
- **Popup** for selected node details
- **Edit modal** for node creation/update
- **JSON modal** for import/export
- **Legend + zoom controls** anchored in corners

### Modes
- **View mode (default)**:
  - users can pan/zoom/select nodes
  - edit actions are hidden/disabled
  - popup shows read-only details
- **Edit mode**:
  - enables node drag/reposition
  - enables add/edit/delete/re-layout and JSON apply
  - exposes richer relationship sections in popup

Edit mode is toggled by the lock button in the top-right controls.

---

## Data Source and Management

## Source-of-Truth Data
Tree content is loaded from:
- `data/tree-data.js`

This file defines:
- `window.TREE_DATA = { title, nodes, positions }`

No server is required; no JSON fetch is required for normal operation.

### Node Structure (current)
Each node may include:
- `id: string` (unique key)
- `title: string` (supports `\n` line breaks)
- `desc: string`
- `status: 'done' | 'prog' | 'plan' | 'expl'`
- `icon: string` (emoji/text OR image path, e.g. `images/foo.png`)
- `parent: string | null`
- `deps: string[]` (cross-stream dependencies; node depends on these ids)
- `link?: string` (click-through URL)
- `etaDate?: string` (`YYYY-MM-DD` for estimated delivery)

Top-level data object also includes:
- `title: string`
- `positions: Record<string, {x:number,y:number}>` (manual drag overrides)

### Data Hygiene Rules in Runtime
Runtime normalizes/sanitizes:
- invalid/missing `deps`
- non-numeric position overrides
- stale layout fields from imported data (`_x`, `_y` are not trusted input)

Orphaned nodes (missing parent target) are treated as roots to avoid NaN layout issues.

---

## Visualization Semantics

### Hierarchy Links
- Always routed from **parent bottom** to **child top**

### Dependency Links
- For node `A` with `A.deps = ['B']`:
  - link is drawn from **B bottom** to **A top**
  - communicates that A depends on B

### Node Status Styling
Status controls:
- ring color
- dash style
- opacity behavior
- legend mapping

All status and theme colors are token-driven.

---

## Theming and Styling

The app supports light and dark themes via:
- `html[data-theme="light"]`
- `html[data-theme="dark"]`

Token customization lives in:
- `styles/tokens.css`

Notable tuneable tokens:
- `--tree-line-thickness`
- `--tree-node-border-thickness`
- semantic palette tokens (`--color-primary`, etc.)
- status tokens (`--status-done`, `--status-prog`, etc.)

Component and layout styles are in:
- `styles/tree.css`

---

## Editing and Relationship Features

### Edit Modal Features
- update node title/description/status/icon
- assign/change parent
- manage dependency set (`deps`)
- filter dependency list via search field
- set optional link URL
- set optional estimated delivery date

### Popup Features
- status, title, description
- click-through link (if present)
- delivery ETA as “days to go” / due / overdue
- parent/children/dependency relationship sections shown in edit mode

### Drag and Reparent
- In edit mode, dragging a node and dropping near another valid node reparents it
- cycle prevention is enforced

---

## Asset Conventions

- Company logo:
  - top-left logo slot currently references `images/logo.png`
- Background image:
  - CSS uses `../images/bg.jpg` from `styles/tree.css`
  - SVG background image layer references `images/bg.jpg` from HTML
- Node icons:
  - can be emoji/text or `images/...` paths

---

## Operational Notes for Other AI Agents

When modifying this project:
- keep it static-file compatible (no backend assumptions unless explicitly requested)
- preserve view vs edit mode gating
- keep accessibility labels/tooltips on icon-only controls
- avoid introducing transform/position NaN issues
- prefer token-driven color/size changes over hardcoded values
- maintain load order:
  1. `data/tree-data.js`
  2. `js/app.js`

If adding features:
- document new fields in this file
- keep data backward-compatible where possible
- validate stale/partial data on load

---

## Current Product Intent

This is a collaborative planning artifact for AI capability/program management:
- strategy communication
- sequencing and dependency visibility
- stakeholder-friendly read mode
- governed edit mode for maintaining the map

It is intended to be easy to theme, portable as static files, and straightforward for both humans and AI assistants to maintain.
