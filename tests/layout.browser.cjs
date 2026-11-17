const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');
(async () => {
  const browser = await chromium.launch({headless:true,...(process.env.TREE_BROWSER_PATH ? {executablePath:process.env.TREE_BROWSER_PATH} : process.platform === 'win32' ? {channel:'msedge'} : {})});
  try {
    const page = await browser.newPage({viewport:{width:1600,height:1000}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(pathToFileURL(path.resolve(__dirname,'../tree.html')).href);
    await page.waitForFunction(()=>document.body.getAttribute('aria-busy')==='false');
    const alignment = () => page.evaluate(() => activeNodes().filter(n=>n.parent).flatMap(n=>{
      const parent=activeNodeById(n.parent);
      return parent && resolveAttach(n,parent)==='vertical' && nodePos(n).x!==nodePos(parent).x
        ? [{id:n.id,parent:parent.id,dx:nodePos(n).x-nodePos(parent).x}] : [];
    }));
    assert.deepEqual(await alignment(),[], 'vertical descendants must stay directly under their parent in the actual program tree');
    for(const view of ['workstream','relatedAction','project']){
      await page.evaluate(view=>{setViewMode(view);autoLayout();render();},view);
      assert.deepEqual(await alignment(),[],view+' vertical alignment');
      const first=await page.evaluate(()=>activeNodes().map(n=>({id:n.id,...nodePos(n)})));
      await page.evaluate(()=>{autoLayout();render();});
      assert.deepEqual(await page.evaluate(()=>activeNodes().map(n=>({id:n.id,...nodePos(n)}))),first,view+' idempotent layout');
    }
    // Force a collision after initial placement, then verify nested descendants
    // move by the same amount while explicitly positioned nodes remain fixed.
    await page.evaluate(()=>{
      data=sanitizeLoadedTree({title:'Collision regression',positions:{},nodes:[
        {id:'r',title:'Root',status:'none',parent:null,deps:[],childLayout:'even'},
        {id:'a',title:'First branch',status:'none',parent:'r',deps:[],childLayout:'vertical'},
        {id:'b',title:'A much longer second branch title',status:'none',parent:'r',deps:[],childLayout:'vertical'},
        {id:'b1',title:'Child',status:'none',parent:'b',deps:[],childLayout:'vertical'},
        {id:'b2',title:'Grandchild',status:'none',parent:'b1',deps:[]},
        {id:'manual',title:'Manually placed',status:'none',parent:'b',deps:[]}
      ]});viewMode='project';rebuildActiveView();autoLayout();
      const a=getDataNodeById('a'),b=getDataNodeById('b');
      positionFromOffsets('b',a._x+1,b._y);
      data.positions.manual={x:1234,y:567};
      window.beforeMove=Object.fromEntries(['b','b1','b2'].map(id=>[id,{...nodePos(getDataNodeById(id))}]));
      reduceCollisions();render();
    });
    const moved=await page.evaluate(()=>({
      shifts:['b','b1','b2'].map(id=>nodePos(getDataNodeById(id)).x-window.beforeMove[id].x),
      manual:nodePos(getDataNodeById('manual'))
    }));
    assert.ok(moved.shifts[0]>0,'fixture must trigger collision adjustment');
    assert.ok(moved.shifts.every(dx=>dx===moved.shifts[0]),'entire automatic subtree must move together');
    assert.deepEqual(moved.manual,{x:1234,y:567});
    assert.deepEqual(errors,[]);
    console.log('Passed: real-data vertical alignment, all views, repeatable layout, nested branch collision adjustment and manual-position preservation.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
