const assert=require('node:assert/strict');const path=require('node:path');const {pathToFileURL}=require('node:url');const {chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.TREE_BROWSER_PATH?{executablePath:process.env.TREE_BROWSER_PATH}:process.platform==='win32'?{channel:'msedge'}:{})});try{
 const page=await browser.newPage({viewport:{width:1600,height:1100}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(pathToFileURL(path.resolve(__dirname,'../tree.html')).href);await page.waitForFunction(()=>document.body.getAttribute('aria-busy')==='false');
 for(const id of ['outcome-decisions','outcome-growth']){await page.evaluate(id=>setBranchFocus(id),id);if(process.env.UI_SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.UI_SCREENSHOT_DIR,'dependency-placement-'+id+'.png')});await page.evaluate(()=>clearBranchFocus());}
 const item=(id,parent,extra={})=>({id,title:id,parent,status:'prog',deps:[],icon:'fa-solid fa-diagram-project',sourceProject:'Project',sourceWorkstream:'Main',sourceRelatedAction:'Action',...extra});
 for(const view of ['project','workstream','relatedAction'])for(const style of ['even','vertical','horizontal-left','horizontal-right']){
  const fixture={title:'Dependency placement',positions:{},nodes:[item('root',null,{childLayout:'even'}),item('branch','root',{childLayout:style}),item('a','branch',{sequence:1,deps:['pre-one','pre-two','shared-pre']}),item('b','branch',{sequence:2,deps:['shared-pre']}),item('outside','root',{sourceWorkstream:'External'}),...['pre-one','pre-two','shared-pre'].map(id=>item(id,'outside',{sourceWorkstream:'External'})),...['post-one','post-two'].map(id=>item(id,'outside',{deps:['a'],sourceWorkstream:'External'})),item('shared-post','outside',{deps:['a','b'],sourceWorkstream:'External'}),item('unrelated','outside',{sourceWorkstream:'External'})]};
  await page.evaluate(({fixture,view})=>{data=sanitizeLoadedTree(fixture);focusNodeId=null;selId=null;viewMode=view;settings={...DEFAULT_SETTINGS};rebuildActiveView();autoLayout();}, {fixture,view});
  const full=await page.evaluate(()=>activeNodes().map(n=>({id:n.id,...nodePos(n)})));
  await page.evaluate(()=>setBranchFocus('branch'));
  const result=await page.evaluate(()=>{
   const points=Object.fromEntries(visibleNodes().map(n=>[n.id,nodePos(n)]));
   const boxes=visibleNodes().map(n=>{const p=nodePos(n),e=ownExtent(n,depthOf(n.id));return {id:n.id,left:p.x-e.left,right:p.x+e.right,top:p.y-e.top,bottom:p.y+e.bottom};});
   const overlaps=[];boxes.forEach((a,i)=>boxes.slice(i+1).forEach(b=>{if(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)overlaps.push([a.id,b.id]);}));
   return {points,overlaps,placement:[...dependencyContextPlacement].map(([id,v])=>({id,...v})),core:Object.fromEntries(layoutNodes().map(n=>[n.id,nodePos(n)]))};
  });
  assert.deepEqual(result.overlaps,[],view+'/'+style+' footprints must not overlap');
  assert.equal(result.placement.length,6);
  for(const row of result.placement){const p=result.points[row.id],anchor=result.points[row.anchorId];assert.ok(p.x>anchor.x,'context stays to the right of its anchor');if(row.direction<0)assert.ok(p.y<anchor.y,'prerequisite above target');else assert.ok(p.y>anchor.y,'dependent below source');}
  assert.ok(result.points['shared-pre'].y<Math.min(result.points.a.y,result.points.b.y));
  assert.ok(result.points['shared-post'].y>Math.max(result.points.a.y,result.points.b.y));
  assert.equal(await page.locator('#g-unrelated').count(),0);
  const paths=await page.locator('#lg path[data-dep]').evaluateAll(es=>es.map(el=>({route:el.dataset.route,d:el.getAttribute('d'),arrow:el.getAttribute('marker-end')})));
  assert.ok(paths.length>=8);paths.forEach(p=>{assert.equal(p.route,'direct');assert.match(p.d,/^M .+ L /);assert.doesNotMatch(p.d,/[HV]/);assert.equal(p.arrow,'url(#dep-arrow)');});
  await page.evaluate(()=>{hoverNodeId=null;updateDepHoverArrows();});assert.equal(await page.locator('#lg path[data-dep]:not([marker-end])').count(),0);
  await page.evaluate(()=>{data.nodes.forEach(n=>n.deps=[]);autoLayout();});assert.deepEqual(await page.evaluate(()=>Object.fromEntries(layoutNodes().map(n=>[n.id,nodePos(n)]))),result.core,'context must not shift the main hierarchy');
  await page.evaluate(()=>clearBranchFocus());
  assert.deepEqual(await page.evaluate(()=>activeNodes().map(n=>({id:n.id,...nodePos(n)}))),full,'full layout restores after context placement');
  console.log('Verified local dependency placement: '+view+' / '+style);
 }
 assert.deepEqual(errors,[]);console.log('Passed proximity, above/below direction, collision-free shared/multiple context nodes, original direct dependency connectors, stable core layout and full-layout restoration.');
}catch(error){console.error(error);process.exitCode=1;}finally{await browser.close();}})();
