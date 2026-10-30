'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),site=fs.existsSync(path.join(root,'src/index.html'))?path.join(root,'src'):root;
const {SproutLM}=require(path.join(site,'sprout-runtime.js'));
const config=JSON.parse(fs.readFileSync(path.join(site,'sprout/config.json'),'utf8'));
const bytes=Buffer.from(fs.readFileSync(path.join(site,'sprout/weights.b64'),'utf8').trim(),'base64');
if(fs.existsSync(path.join(site,'sprout/weights.bin')))assert.deepEqual(bytes,fs.readFileSync(path.join(site,'sprout/weights.bin')));
assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),config.weightsSha256);
const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),model=new SproutLM(config,buffer);
function generate(q){const state=model.start(q);let answer='';for(let i=0;i<140;i++){const next=model.next(state);assert(Number.isFinite(next.probability)&&next.probability>0&&next.probability<=1.00001);if(next.done)return answer;answer+=next.text;}return answer;}
const evaluationPath=path.join(root,'docs/SPROUT_EVALUATION.json');
if(fs.existsSync(evaluationPath)){
 const evaluation=JSON.parse(fs.readFileSync(evaluationPath));for(const r of evaluation.results)assert.equal(generate(r.question),r.output,'Python/JS parity: '+r.question);
 console.log('PASS Python/JavaScript greedy-generation parity:',evaluation.results.length,'development prompts');
}
assert(generate('1+1等於幾？').includes('= 2'));
assert(generate('星星有幾個角？').includes('五個'));
assert.throws(()=>new SproutLM(config,new ArrayBuffer(4)),/大小/);
assert.equal(model.start('你'.repeat(10000)).characters,96);
assert.equal(model.start('🎈').unknown,1);
const html=fs.readFileSync(path.join(site,'index.html'),'utf8');
const refs=[...html.matchAll(/(?:src|href|data-worker|data-runtime|data-config|data-weights)="(assets\/[^\"]+)"/g)].map(m=>m[1]);
assert.equal(refs.length,6);for(const ref of refs){const b=fs.readFileSync(path.join(site,ref)),hash=crypto.createHash('sha256').update(b).digest('hex').slice(0,12);assert(ref.includes('.'+hash+'.'));}
assert(!html.includes('chat-model.')&&!html.includes('chat-engine.'));
const runtime=fs.readFileSync(path.join(site,'sprout-runtime.js'),'utf8');
assert(!/FREEFORAI_MODEL|anchors|suggestions|corpus\.json|data\.json/.test(runtime),'No retrieval answer table at runtime');
console.log('PASS real trained weights, expected learned examples, corruption, input bound, content-hashed assets, no retrieval runtime.');
console.log('These checks do not prove general intelligence or answer accuracy.');
