'use strict';
(() => {
 const $=id=>document.getElementById(id), source=document.currentScript;
 const input=$('message'),send=$('send'),history=[];
 let worker=null,ready=false,busy=false,epoch=0,sequence=0,active=null,loadTimer=null,stopTimer=null;
 function controls(){
  send.disabled=busy||!ready||!input.value.trim();$('stop').hidden=!busy;
  input.style.height='auto';input.style.height=Math.min(input.scrollHeight,160)+'px';
 }
 function notice(text){$('notice').textContent=text;}
 function finish(note=''){
  if(active){active.body.setAttribute('aria-busy','false');active.meta.textContent=note;active.record.note=note;}
  active=null;busy=false;clearTimeout(stopTimer);controls();
 }
 function fail(message){
  clearTimeout(loadTimer);ready=false;$('model-state').textContent='模型未就緒';
  $('loading-panel').hidden=false;$('retry').hidden=false;notice(message);
  if(busy)finish('生成失敗，未完成的內容不可當作可靠回答。');controls();
 }
 function boot(){
  if(worker)worker.terminate();epoch++;const current=epoch;ready=false;busy=false;active=null;
  clearTimeout(loadTimer);clearTimeout(stopTimer);$('retry').hidden=true;$('loading-panel').hidden=false;
  $('model-progress').value=0;$('model-state').textContent='小芽載入中';notice('正在下載並核對小芽權重，約 1.4 MB。');controls();
  try{
   if(!window.Worker||!window.crypto?.subtle)throw Error('需要支援 Web Worker 的 HTTPS 瀏覽器');
   const url=name=>new URL(source.dataset[name],document.baseURI).href;
   worker=new Worker(url('worker'));
   worker.onmessage=event=>{
    if(current!==epoch)return;const m=event.data;
    if(m.type==='progress'){
     const size=(m.loaded/1024).toFixed(0);notice('正在載入小芽：'+size+' KB'+(m.total?' / '+(m.total/1024).toFixed(0)+' KB':''));
     if(m.total)$('model-progress').value=Math.min(100,m.loaded/m.total*100);
    }else if(m.type==='ready'){
     clearTimeout(loadTimer);ready=true;$('loading-panel').hidden=true;$('model-state').textContent='小芽 · 自建生成模型';
     notice('模型已就緒。從零訓練的小模型可能答錯；目前只依本則訊息生成。');controls();
    }else if(m.type==='token'&&active&&m.id===active.id){
     active.body.textContent=m.text;active.record.content=m.text;
    }else if(m.type==='complete'&&active&&m.id===active.id){
     active.body.textContent=m.text;active.record.content=m.text;
     let note=m.stopped?'已停止；以上是未完成的生成。':m.limited?'已達 180 字上限。':'由自建神經模型逐字生成；內容請核對。';
     if(!m.text)note='模型沒有產生文字，可換個簡短問法。';
     if(m.unknownRatio>.25)note+=' 問題包含較多模型沒學過的字。';
     finish(note);notice('');input.focus({preventScroll:true});
    }else if(m.type==='error'){
     if(m.phase==='load')fail('模型載入失敗：'+m.message);
     else if(active&&m.id===active.id){finish('生成失敗：'+m.message);notice('可以重新提問，或按重新載入。');}
    }
   };
   worker.onerror=event=>{event.preventDefault();if(current===epoch)fail('模型程式無法執行。請重試；若持續失敗，請確認網路、瀏覽器與本站檔案版本。');};
   worker.onmessageerror=()=>{if(current===epoch)fail('模型訊息傳輸失敗，請重新載入。');};
   loadTimer=setTimeout(()=>{if(current===epoch&&!ready){worker.terminate();fail('模型載入逾時，請檢查網路後重試。');}},30000);
   worker.postMessage({type:'load',runtimeURL:url('runtime'),configURL:url('config'),weightsURL:url('weights')});
  }catch(error){fail('無法啟動模型：'+error.message);}
 }
 function append(role,text){
  const article=document.createElement('article');article.className='message '+role;
  if(role==='assistant'){
   const icon=document.createElement('span');icon.className='avatar';icon.textContent='✳';icon.setAttribute('aria-hidden','true');article.append(icon);
   const label=document.createElement('div');label.className='message-label';label.textContent='小芽 SPROUT · 自建生成';article.append(label);
  }
  const body=document.createElement('div');body.className='message-body';body.textContent=text;article.append(body);
  const meta=document.createElement('div');meta.className='message-meta';article.append(meta);$('messages').append(article);
  const record={role,content:text};history.push(record);$('export').disabled=false;article.scrollIntoView({block:'nearest'});
  return{body,meta,record};
 }
 function submit(value){
  const text=value.trim();if(!text||busy)return;
  if(!ready){notice('模型尚未載入完成，請稍候或重新載入。');return;}
  if(text.length>2000){notice('每則訊息最多 2,000 字。');return;}
  if(history.length>=100){notice('已達 50 次問答，可先匯出再開新對話。');return;}
  $('welcome').hidden=true;$('conversation').hidden=false;notice('');append('user',text);
  active={...append('assistant',''),id:++sequence};active.body.setAttribute('aria-busy','true');busy=true;input.value='';controls();
  worker.postMessage({type:'generate',id:active.id,text});
 }
 $('chat-form').addEventListener('submit',event=>{event.preventDefault();submit(input.value);});
 input.addEventListener('input',controls);
 input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing&&event.keyCode!==229){event.preventDefault();submit(input.value);}});
 for(const button of document.querySelectorAll('[data-prompt]'))button.addEventListener('click',()=>submit(button.dataset.prompt));
 $('stop').addEventListener('click',()=>{
  if(!busy)return;worker.postMessage({type:'stop'});notice('正在停止生成…');
  stopTimer=setTimeout(()=>{if(busy){worker.terminate();finish('已中止；以上為未完成內容。');boot();}},3000);
 });
 $('reset').addEventListener('click',()=>{
  if(history.length&&!window.confirm('清空目前對話？尚未匯出的內容會消失。'))return;
  const interrupted=busy;history.length=0;$('messages').replaceChildren();$('suggestions').replaceChildren();
  $('welcome').hidden=false;$('conversation').hidden=true;$('export').disabled=true;active=null;busy=false;input.value='';
  if(interrupted)boot();else{notice('');controls();}input.focus();
 });
 $('export').addEventListener('click',()=>{
  if(!history.length)return;
  const text='# 小芽 Sprout-Char 對話（自建實驗模型；內容可能錯誤）\n\n'+history.map(m=>(m.role==='user'?'你':'小芽')+'：\n'+m.content+(m.note?'\n['+m.note+']':'')).join('\n\n');
  const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='freeforai-sprout-chat.txt';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 $('about-open').addEventListener('click',()=>$('about').showModal());$('about-close').addEventListener('click',()=>$('about').close());
 $('retry').addEventListener('click',boot);boot();
})();
