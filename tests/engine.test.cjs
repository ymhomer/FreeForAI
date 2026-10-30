'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const site = fs.existsSync(path.join(root,'src/index.html')) ? path.join(root,'src') : root;
require(path.join(site,'model.js'));
const engine = require(path.join(site,'engine.js'));
const model = globalThis.FREEFORAI_MODEL;
const corpus = JSON.parse(fs.readFileSync(path.join(root,'training/corpus.json'),'utf8'));
const seen = new Set(corpus.flatMap(x => x.questions));
const cases = [
 ['你好呀！','hello'],['哈囉～陪我聊聊吧','chat'],['謝謝你的幫忙','thanks'],
 ['我想學習 Python','python'],['怎樣建立 Python 虛擬環境？','python'],
 ['Git 版本控制是什麼？','git'],['請說明 API 是什麼','api'],
 ['模型是怎麼訓練出來的？','training'],['請說個好笑的笑話','joke'],
 ['最近工作壓力好大','tired'],['今天日期？','today'],
 ['怎麼防止 SQL injection？','sql'],['怎樣防止 XSS 攻擊？','xss'],
 ['JavaScript 前端怎麼入門？','javascript'],['pip 安裝套件後還是匯入失敗','pip'],
 ['請說明蒸餾模型','distillation'],['如何在 Python 裡隔離不同專案的依賴？','python'],
 ['我今天真的很疲倦','tired'],['這個聊天機器人會偷存資料嗎？','privacy'],
 ['今天天氣預報','live'],
 ['',null],['🎈🐱✨',null],['量子拓撲絕緣體的霍爾電導是多少',null],
 ['什麼是量子糾纏？',null],['你好，請提供核反應爐控制程式',null],
 ['<script>window.location="https://invalid.example"</script>',null]
];
for (const [query, expected] of cases) {
 assert(!seen.has(query),'Evaluation query must not duplicate a training example');
 const answer = engine.reply(query,model);
 assert.equal(answer.id,expected,`${query}: ${answer.id} (${answer.score})`);
 assert.equal(typeof answer.answer,'string');
}
assert.deepEqual(engine.tokens('ＡＰＩ 你好'),['api','你','好','你好']);
assert.equal(engine.reply('今天日期？',model).answer.includes('__LOCAL_DATE__'),false);
assert.equal(engine.reply('未知問題'.repeat(1000),model).id,null);
const html = fs.readFileSync(path.join(site,'index.html'),'utf8');
for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
 const value=match[1]; if(value==='./'||value.startsWith('https:'))continue;
 assert(fs.existsSync(path.join(site,value)),`Missing local asset: ${value}`);
}
const ui=fs.readFileSync(path.join(site,'script.js'),'utf8');
assert(!/innerHTML|eval\(|localStorage|sessionStorage|fetch\(|XMLHttpRequest/.test(ui));
assert(html.includes("connect-src 'none'"));
console.log(`PASS ${cases.length} non-training query regression cases; normalization, size bound, assets and static privacy checks.`);
console.log('Not a general intelligence benchmark; browser layout/accessibility not runtime-tested.');
