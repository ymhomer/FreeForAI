'use strict';
let model=null,loading=false,generating=false,stop=false;
function post(type,extra={}){self.postMessage({type,...extra});}
function localURL(value){const u=new URL(value,self.location.href);if(u.origin!==self.location.origin)throw Error('模型只能從本網站載入');return u.href;}
async function download(url){
 const response=await fetch(url);if(!response.ok)throw Error('模型下載失敗：HTTP '+response.status);
 const size=Number(response.headers.get('content-length'))||0;
 if(!response.body){return response.arrayBuffer();}
 const reader=response.body.getReader(),chunks=[];let loaded=0;
 while(true){const{done,value}=await reader.read();if(done)break;loaded+=value.byteLength;
  if(loaded>8*1024*1024){await reader.cancel();throw Error('模型超出目前版本的大小限制');}
  chunks.push(value);post('progress',{loaded,total:size});
 }
 const bytes=new Uint8Array(loaded);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes.buffer;
}
self.onmessage=async event=>{
 const message=event.data;
 if(message.type==='stop'){stop=true;return;}
 if(message.type==='load'){
  if(loading||model)return;loading=true;
  try{
   importScripts(localURL(message.runtimeURL));
   const response=await fetch(localURL(message.configURL));if(!response.ok)throw Error('模型設定下載失敗');const config=await response.json();
   let buffer=await download(localURL(message.weightsURL));
   if(config.weightsEncoding==='base64'){
    const encoded=new TextDecoder().decode(buffer).trim();
    const raw=atob(encoded),bytes=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
    buffer=bytes.buffer;
   }
   const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))].map(v=>v.toString(16).padStart(2,'0')).join('');
   if(digest!==config.weightsSha256)throw Error('權重校驗失敗，請重新整理再試');
   model=new self.Sprout.SproutLM(config,buffer);post('ready',{name:config.name,parameters:config.parameters,steps:config.steps});
  }catch(error){post('error',{message:error.message,phase:'load'});}finally{loading=false;}return;
 }
 if(message.type==='generate'){
  if(!model||generating){post('error',{id:message.id,message:'模型尚未就緒或正在生成',phase:'generate'});return;}
  generating=true;stop=false;const id=message.id;let answer='';
  try{
   if(typeof message.text!=='string'||!message.text.trim()||message.text.length>2000)throw Error('訊息必須為 1–2,000 字');
   const state=model.start(message.text);let count=0,confidence=0;const started=performance.now();
   while(count<180&&!stop){
    const next=model.next(state);if(next.done)break;answer+=next.text;confidence+=next.probability;count++;
    if(count%4===0){post('token',{id,text:answer});await new Promise(resolve=>setTimeout(resolve,0));}
    if(performance.now()-started>25000){stop=true;break;}
   }
   post('complete',{id,text:answer,stopped:stop,limited:count>=180,meanProbability:count?confidence/count:0,
    unknownRatio:state.characters?state.unknown/state.characters:0,tokens:count});
  }catch(error){post('error',{id,message:error.message,phase:'generate'});}finally{generating=false;}
 }
};
