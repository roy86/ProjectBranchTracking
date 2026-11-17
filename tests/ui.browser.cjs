const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const example = JSON.parse(fs.readFileSync(path.join(root,'data/AGENTS.md'),'utf8').match(/```json\s*([\s\S]*?)```/)[1]);
const screenshots = process.env.UI_SCREENSHOT_DIR;
async function run(){
  const browser = await chromium.launch({headless:true,...(process.env.TREE_BROWSER_PATH ? {executablePath:process.env.TREE_BROWSER_PATH} : process.platform === 'win32' ? {channel:'msedge'} : {})});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1000},colorScheme:'light'});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    page.on('dialog',d=>d.accept());
    await page.goto(pathToFileURL(path.join(root,'tree.html')).href);
    await page.waitForFunction(()=>document.body.getAttribute('aria-busy')==='false');
    const initialData=JSON.parse(fs.readFileSync(path.join(root,'data/tree-data.json'),'utf8'));
    assert.equal(await page.locator('#ng>.node-group').count(),initialData.nodes.length);
    assert.equal(await page.evaluate(()=>getComputedStyle(document.body).fontFamily.includes('Porsche Next')),true);
    assert.equal(await page.evaluate(()=>document.fonts.check('16px "Porsche Next"')),true);
    assert.equal(await page.locator('#loading-state').isHidden(),true);
    if(screenshots){fs.mkdirSync(screenshots,{recursive:true});await page.screenshot({path:path.join(screenshots,'layout-after.png')});}
    await page.click('#btn-editmode');
    await page.click('#btn-json');
    await page.fill('#jtx',JSON.stringify(example));
    await page.click('#j-apply');
    await page.waitForFunction(()=>!operationPending);
    assert.equal(await page.locator('#ng>.node-group').count(),4);
    const clickNode=async(id,twice=false)=>{
      const point=await page.evaluate(id=>{const p=nodePos(activeNodeById(id));return toScreen(p.x,p.y)},id);
      if(twice)await page.mouse.dblclick(point.x,point.y,{delay:65});else await page.mouse.click(point.x,point.y);
    };
    await page.click('#btn-editmode');
    await clickNode('platform-project',true);
    assert.equal(await page.evaluate(()=>focusNodeId),'platform-project');
    await page.click('#btn-focus-clear');
    for(const view of ['workstream','relatedAction','project']){
      await page.selectOption('#view-mode-select',view);
      await page.waitForFunction(()=>!operationPending);
      assert.equal(await page.evaluate(()=>viewMode),view);
      assert.ok(await page.evaluate(()=>visibleNodes().every(n=>Number.isFinite(nodePos(n).x)&&Number.isFinite(nodePos(n).y))));
    }
    await page.evaluate(()=>{fitMode='all';fitView();});
    await clickNode('platform-design');
    assert.equal(await page.locator('#popup').isVisible(),true);
    assert.equal(await page.locator('.stage-chip small').count(),5);
    await page.waitForTimeout(300);
    await page.mouse.move(0,500);
    if(screenshots){fs.mkdirSync(screenshots,{recursive:true});await page.screenshot({path:path.join(screenshots,'porsche-tree-desktop.png')});}
    await page.click('#pop-x');
    await page.click('#btn-editmode');
    await page.click('#btn-add');
    await page.fill('#e-title','A new work item');
    await page.fill('#e-source-project','Platform');
    await page.fill('#e-source-workstream','Engineering');
    await page.selectOption('#e-parent','platform-project');
    await page.click('#e-save');
    assert.equal(await page.evaluate(()=>data.nodes.length),5);
    await page.click('#btn-json');
    await page.fill('#jtx','{broken');
    await page.click('#j-apply');await page.waitForFunction(()=>!operationPending);
    assert.equal(await page.locator('#feedback').getAttribute('data-kind'),'error');
    assert.equal(await page.locator('#jmod').getAttribute('class').then(v=>v.includes('open')),true);
    assert.equal(await page.evaluate(()=>data.nodes.length),5);
    const cycle=structuredClone(example);cycle.nodes[0].parent='platform-design';
    await page.fill('#jtx',JSON.stringify(cycle));await page.click('#j-apply');await page.waitForFunction(()=>!operationPending);
    assert.match(await page.locator('#feedback').innerText(),/cycle/);
    await page.press('#jtx','Escape');
    await page.evaluate(()=>{document.getElementById('feedback').hidden=true;});
    await page.click('#btn-settings');
    await page.click('#s-theme button[data-val="dark"]');
    assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).colorScheme),'dark');
    if(screenshots)await page.screenshot({path:path.join(screenshots,'porsche-tree-dark.png')});
    await page.click('#s-theme button[data-val="light"]');
    await page.click('#settings-close');
    await page.evaluate(()=>{data.title='A program with a deliberately long title that should wrap without covering any controls';syncTitle();});
    for(const width of [1440,1024,768,390,320]){
      await page.setViewportSize({width,height:900});await page.waitForTimeout(100);
      const issues=await page.evaluate(()=>{
        const selectors=['#title-text','#view-mode-select','#btn-editmode','#btn-add','#btn-settings','#zctl'];
        return selectors.flatMap(s=>{const el=document.querySelector(s),r=el.getBoundingClientRect();return r.width && (r.left<-.5 || r.right>innerWidth+.5) ? [s] : []});
      });
      assert.deepEqual(issues,[],`controls should fit at ${width}px`);
    }
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(()=>fitView('all'));
    if(screenshots)await page.screenshot({path:path.join(screenshots,'porsche-tree-mobile.png')});
    await page.click('#btn-add');
    assert.equal(await page.evaluate(()=>!!document.activeElement.closest('.modal')),true);
    await page.locator('#e-save').focus();await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'e-cancel-top');
    assert.equal(await page.locator('#e-save').isVisible(),true);
    const saveBox=await page.locator('#e-save').boundingBox();assert.ok(saveBox.y+saveBox.height<=844);
    if(screenshots)await page.screenshot({path:path.join(screenshots,'porsche-tree-editor-mobile.png')});
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#emod').getAttribute('class').then(v=>v.includes('open')),false);
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('.btn')).transitionDuration),'0s');
    assert.deepEqual(errors,[]);
    console.log('Passed: offline font loading, startup, all views, focus, CRUD, import/error states, theme, responsive controls at 320–1440px, dialog focus, reduced motion; no browser exceptions.');
  } finally {await browser.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
