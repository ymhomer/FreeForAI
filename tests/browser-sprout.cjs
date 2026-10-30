/* Actual Chromium + actual trained weights, HTTPS route fixture, no listening server. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),site=fs.existsSync(path.join(root,'src/index.html'))?path.join(root,'src'):root;
fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});
const {chromium}=require(require.resolve('playwright',{paths:[path.join(root,'artifacts/browser-check'),root]}));
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.bin':'application/octet-stream'};
(async()=>{
 const browser=await chromium.launch({headless:true});
 const result=[];
 try{
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile,serviceWorkers:'block'});
  const errors=[],requests=[];let corrupt=false;
  await context.route('**/*',async route=>{
   const u=new URL(route.request().url());requests.push(u.href);
   if(u.origin!=='https://sprout.test')throw Error('Unexpected external request '+u.href);
   const pathname=decodeURIComponent(u.pathname);const target=path.join(site,pathname==='/'?'index.html':pathname);
   if(!target.startsWith(site+path.sep)||!fs.existsSync(target))return route.fulfill({status:404,body:'Not found'});
   const body=fs.readFileSync(target);if(corrupt&&target.endsWith('.b64'))body[0]=body[0]===65?66:65;
   await route.fulfill({status:200,contentType:types[path.extname(target)]||'application/octet-stream',body});
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('https://sprout.test/');await page.locator('#model-state').filter({hasText:'自建生成模型'}).waitFor({state:'attached',timeout:20000});
  assert.equal(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),'rgb(245, 244, 239)');
  await page.locator('#message').fill('1+1等於幾？');await page.locator('#send').click();
  await page.locator('.message-meta').filter({hasText:'由自建神經模型'}).waitFor({timeout:15000});
  const answer=await page.locator('.message.assistant .message-body').last().innerText();assert(answer.includes('= 2'),answer);
  await page.locator('#message').fill('星星有幾個角？');await page.locator('#send').click();
  await page.locator('.message.assistant').last().locator('.message-meta').filter({hasText:'由自建神經模型'}).waitFor();
  assert((await page.locator('.message.assistant .message-body').last().innerText()).includes('五個'));
  await page.locator('#about-open').click();assert(await page.locator('#about').isVisible());await page.keyboard.press('Escape');
  const count=await page.locator('.message.user').count();
  await page.locator('#message').fill('你好');
  await page.locator('#message').dispatchEvent('keydown',{key:'Enter',isComposing:true});
  assert.equal(await page.locator('.message.user').count(),count,'IME composition must not send');
  await page.locator('#message').fill('<img src=x onerror="window.bad=true">');await page.locator('#send').click();
  assert.equal(await page.locator('.message.user img').count(),0);assert.equal(await page.evaluate(()=>window.bad),undefined);
  await page.locator('.message.assistant').last().locator('.message-meta').waitFor();
  // Clear while generating: late worker updates must not repopulate the reset view.
  page.on('dialog',dialog=>dialog.accept());await page.locator('#reset').click();
  await page.waitForTimeout(200);assert.equal(await page.locator('.message').count(),0);
  await page.locator('#model-state').filter({hasText:'自建生成模型'}).waitFor({state:'attached'});
  await page.locator('[data-prompt="陪我聊聊"]').click();
  await page.locator('.message.assistant .message-meta').filter({hasText:'由自建神經模型'}).waitFor();
  await page.evaluate(()=>{document.getElementById('message').value='你是誰';document.getElementById('message').dispatchEvent(new Event('input'));document.getElementById('send').click();document.getElementById('stop').click();});
  await page.locator('.message.assistant').last().locator('.message-meta').filter({hasText:'已停止'}).waitFor();
  const downloaded=page.waitForEvent('download');await page.locator('#export').click();const download=await downloaded;
  const exported=fs.readFileSync(await download.path(),'utf8');assert(exported.includes('小芽 Sprout-Char 對話'));assert(exported.includes('你是誰'));
  await page.screenshot({path:path.join(root,'artifacts',mobile?'sprout-mobile.png':'sprout-desktop.png'),fullPage:true});
  corrupt=true;await page.reload();await page.locator('#notice').filter({hasText:'權重校驗失敗'}).waitFor();assert(await page.locator('#send').isDisabled());
  corrupt=false;await page.locator('#retry').click();await page.locator('#model-state').filter({hasText:'自建生成模型'}).waitFor({state:'attached'});

  assert.deepEqual(errors,[]);assert(!requests.some(u=>/huggingface|jsdelivr|openai/.test(u)));
  assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);
  result.push({viewport:mobile?'mobile-emulation':'desktop',modelLoad:true,realGeneration:true,arithmetic:true,starAnswer:true,ime:true,reset:true,stop:true,export:true,corruptWeightsRejected:true,retry:true,noExternalRequests:true,pageErrors:errors});
  await context.close();
 }
 fs.writeFileSync(path.join(root,'docs/BROWSER_SPROUT.json'),JSON.stringify({browser:'Chromium headless',realMobileDevice:false,checks:result},null,2)+'\n');
 console.log(JSON.stringify(result,null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
