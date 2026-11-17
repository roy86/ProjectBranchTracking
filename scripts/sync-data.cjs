const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const statuses = ['none', 'done', 'prog', 'plan', 'expl'];
const layouts = ['even', 'vertical', 'horizontal-right', 'horizontal-left'];
const stages = ['discover', 'design', 'approve', 'build', 'test'];
const stageStatuses = ['pending', 'in_progress', 'done', 'blocked'];
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = message => { throw new Error(message); };

function validate(data) {
  if (!object(data) || typeof data.title !== 'string' || !data.title.trim()) fail('title must be a non-empty string');
  if (!Array.isArray(data.nodes) || !data.nodes.length) fail('nodes must be a non-empty array');
  const byId = new Map();
  for (const node of data.nodes) {
    if (!object(node)) fail('Every node must be an object');
    if (typeof node.id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(node.id)) fail('Node ids must use lowercase letters, digits and hyphens');
    if (byId.has(node.id)) fail(`Duplicate id: ${node.id}`);
    byId.set(node.id, node);
    if (typeof node.title !== 'string' || !node.title.trim()) fail(`${node.id}: title is required`);
    if (!statuses.includes(node.status)) fail(`${node.id}: invalid status`);
    if (node.parent !== null && typeof node.parent !== 'string') fail(`${node.id}: parent must be an id or null`);
    if (!Array.isArray(node.deps) || node.deps.some(id => typeof id !== 'string')) fail(`${node.id}: deps must be an array of ids`);
    if (new Set(node.deps).size !== node.deps.length) fail(`${node.id}: duplicate dependencies`);
    for (const field of ['desc','icon','sourceProject','sourceWorkstream','sourceRelatedAction','sourceActivityId','sourceStage']) {
      if (node[field] !== undefined && typeof node[field] !== 'string') fail(`${node.id}: ${field} must be a string`);
    }
    if (node.link !== undefined && (typeof node.link !== 'string' || (node.link && !/^https?:\/\//i.test(node.link)))) fail(`${node.id}: link must be empty or an HTTP(S) URL`);
    if (node.etaDate !== undefined && node.etaDate !== '') {
      if (typeof node.etaDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(node.etaDate)) fail(`${node.id}: etaDate must be YYYY-MM-DD`);
      const date = new Date(node.etaDate + 'T00:00:00Z');
      if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== node.etaDate) fail(`${node.id}: invalid calendar date`);
    }
    for (const field of ['childLayout','attach']) {
      if (node[field] !== undefined && !layouts.includes(node[field])) fail(`${node.id}: invalid ${field}`);
    }
    if (node.sequence !== undefined && (typeof node.sequence !== 'number' || !Number.isFinite(node.sequence))) fail(`${node.id}: sequence must be a finite number`);
    if (node.invertInDark !== undefined && typeof node.invertInDark !== 'boolean') fail(`${node.id}: invertInDark must be boolean`);
    if (node.stageStatuses !== undefined && (!object(node.stageStatuses) || Object.entries(node.stageStatuses).some(([key,value]) => !stages.includes(key) || !stageStatuses.includes(value)))) fail(`${node.id}: invalid stageStatuses`);
    for (const field of ['_x','_y','_virtual']) if (field in node) fail(`${node.id}: omit runtime field ${field}`);
  }
  for (const node of data.nodes) {
    if (node.parent !== null && !byId.has(node.parent)) fail(`${node.id}: missing parent ${node.parent}`);
    if (node.deps.some(id => id === node.id || !byId.has(id))) fail(`${node.id}: missing dependency or self-dependency`);
  }
  // Iterative graph traversal avoids stack overflow with long source hierarchies.
  function acyclic(edges, label) {
    const finished = new Set();
    for (const id of byId.keys()) {
      const visiting = new Set();
      const stack = [[id, false]];
      while (stack.length) {
        const [current, exit] = stack.pop();
        if (exit) { visiting.delete(current); finished.add(current); continue; }
        if (visiting.has(current)) fail(`${label} cycle at ${current}`);
        if (finished.has(current)) continue;
        visiting.add(current);
        stack.push([current, true]);
        for (const next of edges(byId.get(current))) stack.push([next, false]);
      }
    }
  }
  acyclic(n => n.parent === null ? [] : [n.parent], 'Parent');
  acyclic(n => n.deps, 'Dependency');
  if (data.meta !== undefined) {
    if (!object(data.meta)) fail('meta must be an object');
    for (const field of ['projectOrder','workstreamOrder','relatedActionOrder']) {
      const value = data.meta[field];
      if (value !== undefined && (!Array.isArray(value) || value.some(v => typeof v !== 'string' || !v.trim()))) fail(`meta.${field} must be an array of non-empty strings`);
    }
  }
  function positions(store, label, canonical) {
    if (!object(store)) fail(`${label} must be an object`);
    for (const [id, point] of Object.entries(store)) {
      if (canonical && !byId.has(id)) fail(`${label}: unknown node ${id}`);
      if (!object(point) || !Number.isFinite(point.x) || !Number.isFinite(point.y)) fail(`${label}.${id}: x and y must be finite numbers`);
    }
  }
  if (data.positions !== undefined) positions(data.positions, 'positions', true);
  if (data.viewPositions !== undefined) {
    if (!object(data.viewPositions)) fail('viewPositions must be an object');
    for (const [view, store] of Object.entries(data.viewPositions)) {
      if (!['workstream','relatedAction'].includes(view)) fail(`Unknown position view: ${view}`);
      positions(store, `viewPositions.${view}`, false);
    }
  }
  return data;
}

if (require.main === module) {
  try {
    const data = validate(JSON.parse(fs.readFileSync(path.join(root, 'data/tree-data.json'), 'utf8')));
    if (!process.argv.includes('--check')) {
      fs.writeFileSync(path.join(root, 'data/tree-data.js'), '// Generated from tree-data.json by scripts/sync-data.cjs. Edit the JSON source.\nwindow.TREE_DATA = ' + JSON.stringify(data, null, 2) + ';\n');
    }
    console.log(`Validated ${data.nodes.length} nodes${process.argv.includes('--check') ? '' : '; generated data/tree-data.js'}.`);
  } catch (error) {
    console.error(`Data validation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
module.exports = { validate };
