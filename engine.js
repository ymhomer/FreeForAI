/* Small authored-answer retriever. No external calls or arbitrary code execution. */
(function (root) {
  'use strict';
  function tokens(text) {
    const value = text.normalize('NFKC').toLowerCase();
    const result = value.match(/[a-z0-9]+/g) || [];
    for (const run of value.match(/[\u3400-\u9fff]+/g) || []) {
      result.push(...run);
      for (let i = 0; i < run.length - 1; i++) result.push(run.slice(i, i + 2));
    }
    return result;
  }
  function rank(text, model) {
    const counts = new Map();
    const all = tokens(text);
    for (const term of all) counts.set(term, (counts.get(term) || 0) + 1);
    const v = new Map();
    let sum = 0, known = 0;
    for (const [term, count] of counts) {
      if (!Object.hasOwn(model.idf, term)) continue;
      known += count;
      const weight = (1 + Math.log(count)) * model.idf[term];
      v.set(term, weight); sum += weight * weight;
    }
    const norm = Math.sqrt(sum);
    if (!norm) return [];
    const best = new Map();
    const normalized = text.normalize('NFKC').toLowerCase();
    for (const example of model.examples) {
      // Explicit topic gates prevent generic characters like「什麼是」from
      // choosing an unrelated technical answer. These are authored constraints.
      if (!model.intents[example.id].anchors.some(term => {
        if (/^[a-z0-9]+$/.test(term)) return tokens(text).includes(term);
        return normalized.includes(term);
      })) continue;
      let score = 0;
      for (const [term, weight] of v) score += weight / norm * (example.v[term] || 0);
      // Unknown words must reduce confidence, not disappear from the query.
      score *= Math.sqrt(known / all.length) * 1.15;
      if (score > (best.get(example.id) || 0)) best.set(example.id, score);
    }
    return [...best].map(([id, score]) => ({id, score})).sort((a,b) => b.score - a.score);
  }
  function reply(text, model) {
    const ranked = rank(text.slice(0, 2000), model);
    const winner = ranked[0];
    if (!winner || winner.score < model.threshold ||
        (ranked[1] && winner.score - ranked[1].score < 0.035)) {
      return {id:null, answer:'這題我目前沒有足夠把握回答。我的知識是有限的問答資料，不能像大模型一樣理解任意問題。\n\n你可以試著一次問一個主題，例如 Python 套件、Git、網頁開發或測試；也可以換個話題。',
        suggestions:['你能做什麼？','我想學 Python','陪我聊聊'], score:winner?.score || 0};
    }
    const intent = model.intents[winner.id];
    let answer = intent.answer;
    if (answer === '__LOCAL_DATE__') {
      answer = '依照你這部裝置的時間，今天是 ' + new Intl.DateTimeFormat('zh-TW',
        {year:'numeric',month:'long',day:'numeric',weekday:'long'}).format(new Date()) + '。這不是網路校時結果。';
    }
    return {id:winner.id, answer, suggestions:intent.suggestions || [], score:winner.score};
  }
  const api = {tokens, rank, reply};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FreeForAIEngine = api;
})(globalThis);
