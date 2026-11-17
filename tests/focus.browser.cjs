const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.TREE_BROWSER_PATH?{executablePath:process.env.TREE_BROWSER_PATH}:process.platform==='win32'?{channel:'msedge'}:{})});
  try{
    const page=await browser.newPage({viewport:{width:1600,height:1100}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(pathToFileURL(path.resolve(__dirname,'../tree.html')).href);
    await page.waitForFunction(()=>document.body.getAttribute('aria-busy')==='false');
    await page.evaluate(()=>{setBranchFocus('outcome-decisions');fitView('all');});
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(()=>[...dependencyContextIds].every(id=>{const el=document.getElementById('g-'+id);const r=el.getBoundingClientRect();return r.top>=document.getElementById('topbar').offsetHeight&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth;})),true,'dependency context must fit on screen when focusing');
    if(process.env.UI_SCREENSHOT_DIR){await page.screenshot({path:path.join(process.env.UI_SCREENSHOT_DIR,'dependency-focus.png')});}
    const item=(id,parent,deps=[],workstream='Main')=>({id,title:id,parent,deps,status:'prog',icon:'fa-solid fa-diagram-project',sourceProject:'Project',sourceWorkstream:workstream,sourceRelatedAction:'Action'});
    const fixture={title:'Dependency focus regression',positions:{},nodes:[
      {id:'root',title:'Program',parent:null,deps:['unrelated'],status:'none'},
      item('branch','root'),item('task','branch',['prerequisite','internal']),item('internal','branch'),
      item('prerequisite','root',[],'External'),item('dependent','root',['task'],'External'),
      item('indirect','root',['prerequisite'],'External'),item('unrelated','root',[],'Other'),
      item('context-child','prerequisite',[],'External')
    ]};
    for(const view of ['project','workstream','relatedAction']){
      await page.evaluate(({fixture,view})=>{data=sanitizeLoadedTree(fixture);focusNodeId=null;selId=null;viewMode=view;normalizeAllDeps();rebuildActiveView();autoLayout();setBranchFocus('branch');}, {fixture,view});
      const ids=await page.evaluate(()=>visibleNodes().map(n=>n.id));
      for(const id of ['branch','task','internal','prerequisite','dependent'])assert.ok(ids.includes(id),view+': '+id+' visible');
      for(const id of ['unrelated','indirect','context-child'])assert.ok(!ids.includes(id),view+': '+id+' hidden');
      assert.deepEqual(await page.evaluate(()=>[...dependencyContextIds].sort()),['dependent','prerequisite']);
      assert.equal(await page.locator('#g-prerequisite').evaluate(el=>getComputedStyle(el).opacity),'0.42');
      assert.ok(await page.locator('#g-prerequisite').evaluate(el=>getComputedStyle(el).filter.includes('grayscale(1)')));
      assert.equal(await page.locator('#g-task.dependency-context').count(),0);
      assert.equal(await page.locator('path[data-dep-src="prerequisite"][data-dep-dst="task"].dependency-context').count(),1);
      assert.equal(await page.locator('path[data-dep-src="task"][data-dep-dst="dependent"].dependency-context').count(),1);
      assert.equal(await page.locator('path[data-dep-src="internal"][data-dep-dst="task"].dependency-context').count(),0);
      await page.evaluate(()=>selectNode('prerequisite'));
      assert.equal(await page.evaluate(()=>focusNodeId),'branch');
      assert.equal(await page.locator('#pop-context').isVisible(),true);
      await page.evaluate(()=>{setHighlight('External');render();});
      assert.equal(await page.locator('#g-prerequisite.dependency-context').count(),1);
      assert.equal(await page.locator('#g-prerequisite').getAttribute('opacity'),null);
      await page.evaluate(()=>setBranchFocus('prerequisite'));
      assert.equal(await page.locator('#g-prerequisite.dependency-context').count(),0);
      await page.evaluate(()=>clearBranchFocus());
      assert.equal(await page.evaluate(()=>dependencyContextIds.size),0);
      assert.equal(await page.locator('.node-group.dependency-context').count(),0);
    }
    assert.deepEqual(errors,[]);
    console.log('Passed: direct upstream/downstream context, hidden unrelated/indirect nodes, grey opacity, dependency edges, internal edges, context selection/refocus, highlight coexistence and focus reset across all three views.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
