const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { validate } = require('../scripts/sync-data.cjs');
const root = path.resolve(__dirname, '..');
const fixture = () => ({title:'Test', nodes:[
  {id:'root',title:'Root',status:'none',parent:null,deps:[]},
  {id:'child',title:'Child',status:'plan',parent:'root',deps:[]}
], positions:{}, viewPositions:{}});

test('source JSON validates and matches the generated browser adapter', () => {
  const data = validate(JSON.parse(fs.readFileSync(path.join(root, 'data/tree-data.json'), 'utf8')));
  const context = {window:{}};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'data/tree-data.js'), 'utf8'), context);
  assert.deepEqual(JSON.parse(JSON.stringify(context.window.TREE_DATA)), data);
});
test('the documented complete example validates', () => {
  const text = fs.readFileSync(path.join(root,'data/AGENTS.md'), 'utf8');
  const example = JSON.parse(text.match(/```json\s*([\s\S]*?)```/)[1]);
  assert.equal(validate(example).nodes.length, 4);
});
for (const [name, mutate, message] of [
  ['duplicate ids', d=>d.nodes[1].id='root', /Duplicate/],
  ['missing parents', d=>d.nodes[1].parent='missing', /missing parent/],
  ['parent cycles', d=>d.nodes[0].parent='child', /Parent cycle/],
  ['missing dependencies', d=>d.nodes[1].deps=['missing'], /missing dependency/],
  ['dependency cycles', d=>{d.nodes[0].deps=['child'];d.nodes[1].deps=['root'];}, /Dependency cycle/],
  ['invalid dates', d=>d.nodes[1].etaDate='2026-02-30', /invalid calendar/],
  ['invalid stage values', d=>d.nodes[1].stageStatuses={build:'finished'}, /stageStatuses/],
  ['computed positions', d=>d.nodes[1]._x=100, /runtime field/],
  ['nonfinite positions', d=>d.positions={root:{x:Infinity,y:0}}, /finite numbers/]
]) test(`rejects ${name}`, () => {const d=fixture();mutate(d);assert.throws(()=>validate(d),message);});
test('valid shared dependencies do not produce a false cycle', () => {
  const d=fixture();
  d.nodes.push({id:'last', title:'Last',status:'plan',parent:'root',deps:['root','child']});
  d.nodes[1].deps=['root'];
  assert.doesNotThrow(()=>validate(d));
});
