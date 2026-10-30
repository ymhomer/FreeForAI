'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const input = $('message'), send = $('send'), messages = $('messages');
  const model = globalThis.FREEFORAI_MODEL, engine = globalThis.FreeForAIEngine;
  const history = [];
  let busy = false, revision = 0;
  function updateInput() {
    send.disabled = busy || !input.value.trim() || !model || !engine;
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 160) + 'px';
  }
  function append(role, text) {
    const article = document.createElement('article');
    article.className = 'message ' + role;
    if (role === 'assistant') {
      const icon = document.createElement('span'); icon.className = 'avatar';
      icon.textContent = '✳'; icon.setAttribute('aria-hidden','true'); article.append(icon);
      const label = document.createElement('div'); label.className = 'message-label';
      label.textContent = 'FREEFORAI · 本機問答'; article.append(label);
    }
    const body = document.createElement('div'); body.className = 'message-body';
    body.textContent = text; article.append(body); messages.append(article);
    history.push({role, content:text}); $('export').disabled = false;
    article.scrollIntoView({block:'nearest', behavior:'auto'});
  }
  function suggestions(items) {
    $('suggestions').replaceChildren();
    for (const text of items) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = text;
      button.addEventListener('click', () => submit(text)); $('suggestions').append(button);
    }
  }
  function submit(value) {
    const text = value.trim();
    if (!text || busy || !model || !engine) return;
    if (text.length > 2000) { $('notice').textContent = '每則訊息最多 2,000 字。'; return; }
    // Bound the transient DOM/history; no hidden persistence or data collection.
    if (history.length >= 200) { $('notice').textContent = '已達 100 次問答；可先匯出，再開新對話。'; return; }
    busy = true; const current = revision;
    $('notice').textContent = ''; $('welcome').hidden = true; $('conversation').hidden = false;
    suggestions([]); append('user',text); input.value = ''; updateInput();
    // Yield one frame to keep large messages responsive, not fake streaming.
    setTimeout(() => {
      if (current !== revision) return;
      try { const result = engine.reply(text, model); append('assistant',result.answer); suggestions(result.suggestions); }
      catch (_) { $('notice').textContent = '本機模型處理失敗，請重新整理再試。'; }
      finally { busy = false; updateInput(); input.focus({preventScroll:true}); }
    }, 0);
  }
  $('chat-form').addEventListener('submit', event => {event.preventDefault(); submit(input.value);});
  input.addEventListener('input',updateInput);
  input.addEventListener('keydown',event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229) {
      event.preventDefault(); submit(input.value);
    }
  });
  for (const button of document.querySelectorAll('[data-prompt]')) button.addEventListener('click',() => submit(button.dataset.prompt));
  $('reset').addEventListener('click',() => {
    if (history.length && !window.confirm('清空目前對話？尚未匯出的內容會消失。')) return;
    revision++; busy = false; history.length = 0; messages.replaceChildren(); suggestions([]);
    $('conversation').hidden = true; $('welcome').hidden = false; $('notice').textContent = '';
    $('export').disabled = true; input.value = ''; updateInput(); input.focus();
  });
  $('export').addEventListener('click',() => {
    if (!history.length) return;
    const content = '# FreeForAI 對話\n\n' + history.map(m => (m.role === 'user' ? '你' : 'FreeForAI') + '：\n' + m.content).join('\n\n');
    const url = URL.createObjectURL(new Blob([content],{type:'text/plain;charset=utf-8'}));
    const link = document.createElement('a'); link.href = url; link.download = 'freeforai-chat.txt';
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url),1000);
  });
  $('about-open').addEventListener('click',() => $('about').showModal());
  $('about-close').addEventListener('click',() => $('about').close());
  if (!model || !engine) $('notice').textContent = '模型檔案未載入。請確認 model.js 與 engine.js 已一併放入網站。';
  else $('notice').textContent = '';
  updateInput();
})();
