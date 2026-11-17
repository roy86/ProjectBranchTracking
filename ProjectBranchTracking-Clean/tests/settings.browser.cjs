const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const modes=['even','vertical','horizontal-right','horizontal-left'];
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.TREE_BROWSER_PATH?{executablePath:process.env.TREE_BROWSER_PATH}:process.platform==='win32'?{channel:'msedge'}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1100},colorScheme:'light'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve(__dirname,'../tree.html')).href);
  await page.waitForFunction(()=>document.body.getAttribute('aria-busy')==='false');
  const load=mode=>page.evaluate(mode=>{
   const node=(id,parent,title,extra={})=>({id,title,parent,sequence:id.charCodeAt(0),status:'prog',icon:'fa-solid fa-diagram-project',deps:[],sourceProject:'Project',sourceWorkstream:'Workstream',sourceRelatedAction:'Action',...extra});
   const children=mode==='mixed' ? ['even','vertical','horizontal-right','horizontal-left'].flatMap((attach,i)=>[node('a'+i,'root','Short',{attach}),node('b'+i,'root','A significantly longer sibling title',{attach})]) : [node('a','root','Short'),node('b','root','A significantly longer sibling title'),node('c','root','Third sibling',{deps:['a']})];
   data=sanitizeLoadedTree({title:'Settings audit',nodes:[node('root',null,'Parent',{childLayout:mode==='mixed'?'even':mode}),...children],positions:{}});
   viewMode='project';focusNodeId=null;selId=null;highlightedProject='';highlightedWorkstream='';settings={...DEFAULT_SETTINGS};rebuildActiveView();populateHighlightSelect();populateSettingsInputs();applyAllSettings();
  },mode);
  const slider=async(id,value)=>{
   await page.locator('#'+id).evaluate((el,value)=>{el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},value);
  };
  const coords=()=>page.evaluate(()=>Object.fromEntries(activeNodes().filter(n=>!n._virtual).map(n=>{const p=nodePos(n),r=nodePos(activeNodeById('root'));return[n.id,{x:p.x-r.x,y:p.y-r.y}]})));
  const sane=async()=>assert.ok(await page.evaluate(()=>activeNodes().every(n=>Number.isFinite(nodePos(n).x)&&Number.isFinite(nodePos(n).y))));
  await page.click('#btn-settings');
  for(const view of ['project','workstream','relatedAction']){
  for(const mode of [...modes,'mixed']){
   await load(mode);
   if(view!=='project') await page.evaluate(view=>setViewMode(view),view);
   await slider('s-line-thickness',.5);
   const narrow=await page.locator('#lg path').evaluateAll(es=>es.map(el=>parseFloat(getComputedStyle(el).strokeWidth)));
   await slider('s-line-thickness',2.5);
   const thick=await page.locator('#lg path').evaluateAll(es=>es.map(el=>parseFloat(getComputedStyle(el).strokeWidth)));
   assert.equal(narrow.length,thick.length);thick.forEach((n,i)=>assert.ok(Math.abs(n/narrow[i]-5)<.001,mode+' line scale'));
   await slider('s-node-border',.5);
   const borders=()=>page.locator('#g-root>circle[stroke]').evaluateAll(es=>es.map(el=>parseFloat(getComputedStyle(el).strokeWidth)));
   const thinBorder=await borders();await slider('s-node-border',2.5);const thickBorder=await borders();thickBorder.forEach((n,i)=>assert.ok(Math.abs(n/thinBorder[i]-5)<.001,mode+' node border scale'));
   if(mode!=='mixed'){
    const sideways=mode.startsWith('horizontal');
    await slider('s-vertical-gap',30);const low=await coords();await slider('s-vertical-gap',160);const high=await coords();
    assert.equal(high.b.y>high.a.y,mode!=='even');
    if(mode==='even')assert.deepEqual(high,low,'stack gap must not shift even rows');else assert.ok(high.b.y-high.a.y>low.b.y-low.a.y,mode+' stacked sibling gap');
    await slider('s-side-offset',30);const near=await coords();await slider('s-side-offset',280);const far=await coords();
    if(sideways){assert.ok(Math.abs(far.a.x)>Math.abs(near.a.x));assert.equal(far.a.x,far.b.x,mode+' side siblings must share a column');}else assert.deepEqual(far,near);
    await slider('s-side-angle',0);const flat=await coords();await slider('s-side-angle',45);const dropped=await coords();
    if(sideways){assert.equal(flat.a.y,0);assert.ok(dropped.a.y>flat.a.y);assert.equal(flat.a.x,dropped.a.x);}else assert.deepEqual(flat,dropped);
    await slider('s-level-gap',.6);const close=await coords();await slider('s-level-gap',1.8);const wide=await coords();
    if(sideways)assert.deepEqual(close,wide,'downward level spacing must not alter side branches');else assert.ok(wide.a.y>close.a.y,mode+' level spacing');
   }
   await sane();
   console.log('Verified settings: '+view+' / '+mode);
  }
  }
  // Controls that do not apply should say so instead of silently doing nothing.
  await load('even');
  assert.equal(await page.locator('#s-vertical-gap').isDisabled(),true);
  assert.equal(await page.locator('#s-side-offset').isDisabled(),true);
  assert.equal(await page.locator('#s-side-angle').isDisabled(),true);
  assert.equal(await page.locator('#s-level-gap').isDisabled(),false);
  await load('horizontal-right');assert.equal(await page.locator('#s-level-gap').isDisabled(),true);
  // Border sizing must remain effective when a node has keyboard focus.
  await page.evaluate(()=>document.getElementById('g-root').focus());
  await slider('s-node-border',.5);const beforeFocus=await page.locator('#g-root>.node-border').evaluate(el=>parseFloat(getComputedStyle(el).strokeWidth));
  await slider('s-node-border',2.5);const afterFocus=await page.locator('#g-root>.node-border').evaluate(el=>parseFloat(getComputedStyle(el).strokeWidth));
  assert.ok(Math.abs(afterFocus/beforeFocus-5)<.001);
  // Live settings preserve the camera and explicit manual node positions.
  await page.evaluate(()=>{data.positions.a={x:1234,y:567};px=17;py=23;sc=.8;selectNode('a');});
  await slider('s-side-offset',100);
  assert.deepEqual(await page.evaluate(()=>({position:nodePos(getDataNodeById('a')),camera:[px,py,sc]})),{position:{x:1234,y:567},camera:[17,23,.8]});
  const popupAnchor=await page.locator('#popup').evaluate(el=>[el.style.left,el.style.top]);
  await slider('s-side-offset',280);
  assert.deepEqual(await page.locator('#popup').evaluate(el=>[el.style.left,el.style.top]),popupAnchor);
  await page.evaluate(()=>{delete data.positions.a;selectNode('root');selectNode('b');});
  const oldPopup=await page.locator('#popup').evaluate(el=>[el.style.left,el.style.top]);
  await slider('s-side-offset',30);
  assert.notDeepEqual(await page.locator('#popup').evaluate(el=>[el.style.left,el.style.top]),oldPopup,'popup must track nodes after spacing changes');
  await page.click('#s-theme button[data-val="dark"]');assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'dark');
  await page.emulateMedia({colorScheme:'light'});assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'dark');
  await page.click('#s-theme button[data-val="light"]');assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'light');
  await page.click('#s-theme button[data-val="auto"]');await page.emulateMedia({colorScheme:'dark'});await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
  await page.emulateMedia({colorScheme:'light'});await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('tree-settings')).sideOffset),30);
  await page.evaluate(()=>{data.positions.a={x:1234,y:567};});
  await page.click('#s-reset');
  assert.equal(await page.evaluate(()=>JSON.stringify(settings)===JSON.stringify(DEFAULT_SETTINGS)),true);
  assert.deepEqual(await page.evaluate(()=>data.positions),{a:{x:1234,y:567}});
  // Corrupt/out-of-range settings must not break labels, layout or CSS on reload.
  await page.evaluate(()=>localStorage.setItem('tree-settings',JSON.stringify({theme:'invalid',lineThickness:'broken',nodeBorderThickness:-5,verticalGap:1e6,sideOffset:null,sideAngle:90,levelGapScale:1e6})));
  await page.reload();await page.waitForFunction(()=>document.body.getAttribute('aria-busy')==='false');
  assert.equal(await page.evaluate(()=>settings.theme),'auto');
  assert.equal(await page.evaluate(()=>settings.lineThickness),1);
  assert.equal(await page.evaluate(()=>settings.nodeBorderThickness),.5);
  assert.equal(await page.evaluate(()=>settings.verticalGap),160);
  assert.equal(await page.evaluate(()=>settings.sideOffset),150);
  assert.equal(await page.evaluate(()=>settings.sideAngle),45);
  assert.equal(await page.evaluate(()=>settings.levelGapScale),1.8);
  assert.equal(await page.evaluate(()=>Object.values(settings).every(value=>typeof value==='string'||Number.isFinite(value))),true);
  assert.deepEqual(errors,[]);
  console.log('Passed all settings: branching matrix, applicability, focus borders, popup tracking, camera/manual positions, appearance/system theme, persistence, reset and stored-value validation.');
 }catch(error){console.error(error);process.exitCode=1;}finally{await browser.close();}
})();



