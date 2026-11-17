# Program data generation instructions

These instructions apply to data in this folder. Read them before producing content.

## Deliverables and workflow

Create or replace `tree-data.json` with one valid JSON object containing the whole
program. Then run `node scripts/sync-data.cjs` from the application root to validate
it and regenerate `data/tree-data.js`. The JS file is a generated browser adapter;
it is not a second source of truth. It lets `tree.html` run without a local server.
Run `node scripts/sync-data.cjs --check` for validation without rewriting the adapter.

Use strict JSON: double quotes, no comments, trailing commas, JavaScript assignments,
Markdown fences, undefined, NaN or Infinity. Save as UTF-8 without a byte-order mark.
Use actual JSON null for root parents, not the string "null". Use `\n` in JSON strings
for a displayed line break, not `\\n` (which produces literal backslash-n text).

## Top-level object

| Field | Type | Meaning |
| --- | --- | --- |
| title | non-empty string | Page and tree title |
| nodes | non-empty array of nodes | Flat list containing every canonical node |
| meta | object, optional | Ordering metadata described below |
| positions | object, normally `{}` | Optional manual positions keyed by canonical node id |
| viewPositions | object, normally `{}` | Optional workstream/relatedAction position stores |

Do not nest child objects inside parent nodes. The flat `parent` references define
the Project view. Multiple root nodes are supported. Replace the starter PROGRAM node
unless it is appropriate to the supplied source material.

## Node contract

| Field | Type / allowed values | Guidance |
| --- | --- | --- |
| id | required string | Stable unique lowercase slug: letters, digits, hyphens; start with a letter or digit. Never use runtime `__view_` ids. |
| title | required non-empty string | Short readable label; optional `\n` line breaks |
| status | required string | `none`, `done`, `prog`, `plan`, `expl` |
| parent | required string or null | Existing canonical parent id, or null for a root |
| deps | required string array | Existing ids this node depends on; use `[]` when none are stated |
| desc | optional string | Plain text description grounded in source material |
| icon | optional string | Bundled Font Awesome class, such as `fa-solid fa-diagram-project`; use solid icons available in the local library |
| sourceProject | optional string | Exact consistent project name for grouping/highlighting |
| sourceWorkstream | optional string | Exact consistent workstream name for grouping/highlighting |
| sourceRelatedAction | optional string | Exact consistent related action label |
| sourceActivityId | optional string | Original source/register activity identifier |
| sourceStage | optional string | Original source stage label; does not set stage-gate completion |
| sequence | optional finite number | Secondary display order after explicit metadata ordering |
| link | optional string | Absolute HTTP(S) URL from source; omit or empty if unknown |
| etaDate | optional string | Valid `YYYY-MM-DD` delivery date from source; omit or empty if unknown |
| childLayout | optional string | `even`, `vertical`, `horizontal-right`, `horizontal-left` |
| attach | optional string | Same layout values; overrides how this child attaches to its parent |
| invertInDark | optional boolean | Legacy field, preserved for compatibility; the current Font Awesome renderer does not use image inversion |
| stageStatuses | optional object | Per-stage state, described below |

Status mapping: none = no established status, done = completed, prog = in progress,
plan = planned, expl = exploring. Use none when completion state is unknown; do not
infer completion from dates or words such as "approved" without supporting context.

Stage keys: `discover`, `design`, `approve`, `build`, `test`.
Each stage value is `pending`, `in_progress`, `done`, or `blocked`.
Omitted stages display as pending. Omit stageStatuses when no stage evidence exists.
Do not generate the legacy single `stageGate` field.

A.deps = [B.id] means A depends on B; the arrow points B -> A. Parent relationships
already draw hierarchy lines, so do not add dependencies just to repeat hierarchy.
All ids must be unique. Parents and dependencies must exist. No self-links or cycles
in either graph, and no repeated dependency ids. Keep ids stable across regeneration,
even when a title changes. Keep related but distinct work items as separate nodes.

Do not generate `_x`, `_y`, `_virtual`, runtime grouping nodes or guessed coordinates.
Keep `positions` and `viewPositions` empty for fresh source data. If starting with a
runtime JSON export, remove computed fields before validating; retain deliberate
manual positions only when the user requests them.

## Views, metadata and ordering

- Project view uses parent references. A practical hierarchy is program > project >
  related action / deliverable > activity, adapting to the actual source structure.
- Workstream view groups source-bearing nodes by sourceWorkstream and preserves
  matching source ancestry within each group.
- Related Action view groups by sourceWorkstream, then sourceRelatedAction.
- Only nodes with at least one source metadata field participate in the generated
  views (sourceProject, sourceWorkstream, sourceRelatedAction, sourceActivityId or
  sourceStage). Set metadata on every node that should appear in these views.
- Nodes without a workstream or action are grouped as Unassigned when they otherwise
  qualify for these views. Views are disabled if there is no source metadata at all.
- Avoid generating artificial Workstream/Related Action group nodes; the tool creates
  these automatically. Group labels should be consistent, including case/spacing.
- `meta.projectOrder`, `meta.workstreamOrder` and `meta.relatedActionOrder` are arrays
  of display labels in the intended order. They are labels, not node ids. Unknown
  values sort after listed values. Optional sequence breaks remaining ties, followed
  by title. Use only source-supported ordering.
- Highlighting uses workstream labels in Project/Related Action views and project
  labels in Workstream view.

## Complete illustrative example

This is fictional format guidance. Do not copy its content into real program data.

```json
{
  "title": "Example Program",
  "meta": {
    "projectOrder": ["Platform"],
    "workstreamOrder": ["Engineering", "Assurance"],
    "relatedActionOrder": ["Establish platform"]
  },
  "nodes": [
    {
      "id": "example-program",
      "title": "EXAMPLE PROGRAM",
      "desc": "Program overview.",
      "icon": "fa-solid fa-diagram-project",
      "status": "none",
      "parent": null,
      "deps": []
    },
    {
      "id": "platform-project",
      "title": "PLATFORM",
      "status": "plan",
      "parent": "example-program",
      "deps": [],
      "sourceProject": "Platform",
      "sourceWorkstream": "Engineering",
      "sourceRelatedAction": "Establish platform",
      "childLayout": "vertical"
    },
    {
      "id": "platform-design",
      "title": "PLATFORM DESIGN",
      "desc": "Prepare the design for assurance review.",
      "icon": "fa-solid fa-pen-ruler",
      "status": "prog",
      "parent": "platform-project",
      "deps": [],
      "sourceProject": "Platform",
      "sourceWorkstream": "Engineering",
      "sourceRelatedAction": "Establish platform",
      "sourceActivityId": "EX-001",
      "sequence": 1,
      "stageStatuses": {"discover": "done", "design": "in_progress"}
    },
    {
      "id": "platform-review",
      "title": "ASSURANCE REVIEW",
      "status": "plan",
      "parent": "platform-project",
      "deps": ["platform-design"],
      "sourceProject": "Platform",
      "sourceWorkstream": "Assurance",
      "sourceRelatedAction": "Establish platform",
      "sourceActivityId": "EX-002",
      "sequence": 2
    }
  ],
  "positions": {},
  "viewPositions": {}
}
```

## Source fidelity and final checks

Use only user-provided material for real content. Preserve activity IDs, meaningful
hierarchy, named projects, workstreams, actions and explicit relationships. Do not
invent dates, URLs, statuses, dependencies or missing deliverables. Omit unknown
optional fields. Report ambiguities and unmapped source rows in the handoff, outside
of the JSON. Avoid adding explanatory prose to files the runtime reads.

After generation, run the sync script and `node --test tests/data.test.cjs`. Open
`tree.html` and check the title, node count, layout, dependencies and all applicable
views. The tool displays runtime edits immediately, but it does not write source
files; export JSON and update this source to persist those changes.


## Icon rule for the Porsche interface

Generate only Font Awesome icon classes (for example `fa-solid fa-database`,
`fa-solid fa-shield-halved`, `fa-solid fa-list-check`). Do not generate emoji, image
paths or remote icon URLs for new nodes. The renderer displays a generic Font Awesome
diagram icon for unsupported/legacy values. Data imports remain backward compatible.
