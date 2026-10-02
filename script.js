const OWNER = 'ymhomer';
const REPOSITORY = 'FreeForAI';
const API_URL = `https://api.github.com/repos/${OWNER}/${REPOSITORY}/issues?state=all&per_page=100&sort=created&direction=desc`;

const dialog = document.querySelector('#composer');
const form = document.querySelector('#seed-form');
const titleField = document.querySelector('#seed-title');
const bodyField = document.querySelector('#seed-body');
const nameField = document.querySelector('#seed-name');
const kindField = document.querySelector('#seed-kind');
const countField = document.querySelector('#char-count');
const countLabel = document.querySelector('#seed-count');
const gardenStatus = document.querySelector('#garden-status');
const seedGrid = document.querySelector('#seed-grid');
const shareStatus = document.querySelector('#share-seed-status');
const shareLinkRow = document.querySelector('#share-link-row');
const shareLinkInput = document.querySelector('#share-seed-url');
let lastSeedFingerprint = null;
const universeShell = document.querySelector('#universe-shell');
const roomVeil = document.querySelector('#room-veil');
const roomPanel = document.querySelector('#room-panel');
const stationOrbit = document.querySelector('#station-orbit');
const stationNodes = Array.from(document.querySelectorAll('.station-node'));
const travelStatus = document.querySelector('#travel-status');
let previousFocus = null;
let activeRoom = '';
let orbitTurn = 0;
let dragState = null;

function openComposer({ title = '', body = '', kind = '', name = '' } = {}) {
  titleField.value = title;
  bodyField.value = body;
  nameField.value = name;
  const matchingKind = Array.from(kindField.options).find((option) => option.value === kind || option.textContent.trim() === kind);
  kindField.value = matchingKind ? matchingKind.value : kindField.options[0].value;
  countField.textContent = String(bodyField.value.length);
  shareStatus.textContent = '';
  shareLinkRow.hidden = true;
  dialog.showModal();
  window.setTimeout(() => (titleField.value ? bodyField : titleField).focus(), 0);
}

document.querySelectorAll('[data-open-composer]').forEach((button) => {
  button.addEventListener('click', () => openComposer({
    title: button.dataset.promptTitle || '',
    body: button.dataset.promptBody || '',
    kind: button.dataset.promptKind || '',
  }));
});
document.querySelectorAll('[data-close-composer]').forEach((button) => {
  button.addEventListener('click', () => dialog.close());
});
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});
bodyField.addEventListener('input', () => {
  countField.textContent = String(bodyField.value.length);
});

const roomCatalog = {
  observatory: { element: 'room-observatory', kicker: 'SKYLAB', coordinate: 'SPACE / 01 · IMAGINATION', title: '想像天象館', lede: '在這裡，先遇見五顆還沒有出現在地圖上的星球。' },
  forest: { element: 'room-forest', kicker: 'SEEDWOOD', coordinate: 'SPACE / 02 · COMMUNITY', title: '種子森林', lede: '看看路過的人留下了什麼，再決定你想讓它往哪裡長。' },
  workshop: { element: 'room-workshop', kicker: 'DREAM LAB', coordinate: 'SPACE / 03 · INVENTION', title: '夢想工坊', lede: '不等靈感來；把幾個不相干的碎片丟進去試試。' },
  quiet: { element: 'room-quiet', kicker: 'SLOW MOON', coordinate: 'SPACE / 04 · PAUSE', title: '慢速月台', lede: '什麼也不必完成。跟著微光呼吸一小段時間。' },
  broadcast: { element: 'room-signal', kicker: 'OPEN SIGNAL', coordinate: 'SPACE / 05 · TRANSMISSION', title: '訊號燈', lede: '把一個小念頭包起來，交給這顆星球或下一位路過的人。' },
  forge: { element: 'room-forge', kicker: 'WORLD FORGE', coordinate: 'SPACE / 06 · POCKET WORLDS', title: '造星窟', lede: '用三個小決定造一顆星球，再把它的座標寄給下一位。' },
};

function openRandomRoom() {
  const rooms = ['observatory', 'forest', 'workshop', 'quiet', 'broadcast', 'forge'];
  openRoom(rooms[Math.floor(Math.random() * rooms.length)]);
}

function openRoom(key) {
  const room = roomCatalog[key];
  if (!room) return;
  previousFocus = document.activeElement;
  activeRoom = key;
  document.querySelectorAll('.room-view').forEach((view) => { view.hidden = true; });
  document.querySelector('#' + room.element).hidden = false;
  document.querySelector('#room-kicker').textContent = room.kicker;
  document.querySelector('#room-coordinate').textContent = room.coordinate;
  document.querySelector('#room-title').textContent = room.title;
  document.querySelector('#room-lede').textContent = room.lede;
  roomVeil.hidden = false;
  universeShell.inert = true;
  requestAnimationFrame(() => {
    roomVeil.classList.add('is-open');
    roomPanel.focus();
  });
  travelStatus.textContent = '已抵達：' + room.title + '。';
}

function closeRoom() {
  if (roomVeil.hidden) return;
  roomVeil.classList.remove('is-open');
  universeShell.inert = false;
  pauseRestIfRunning();
  window.setTimeout(() => {
    if (roomVeil.classList.contains('is-open')) return;
    roomVeil.hidden = true;
    if (previousFocus && previousFocus.isConnected) previousFocus.focus();
  }, 250);
  if (activeRoom) travelStatus.textContent = '離開 ' + roomCatalog[activeRoom].title + '，仍在星軌上。';
}

document.querySelectorAll('[data-room-link]').forEach((button) => {
  button.addEventListener('click', () => openRoom(button.dataset.roomLink));
});
document.querySelector('#core-signal').addEventListener('click', openRandomRoom);
document.querySelector('#let-planet-choose').addEventListener('click', openRandomRoom);
document.querySelector('#leave-room').addEventListener('click', closeRoom);
roomVeil.addEventListener('click', (event) => { if (event.target === roomVeil) closeRoom(); });

document.addEventListener('keydown', (event) => {
  if (dialog.open) return;
  if (event.key === 'Escape' && !roomVeil.hidden) {
    event.preventDefault();
    closeRoom();
    return;
  }
  if (roomVeil.hidden && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
    const index = stationNodes.indexOf(document.activeElement);
    if (index !== -1) {
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const nextIndex = (index + direction + stationNodes.length) % stationNodes.length;
      setOrbitTurn(orbitTurn + direction * 60);
      stationNodes[nextIndex].focus();
    }
    return;
  }
  if (!roomVeil.hidden && event.key === 'Tab') {
    const focusable = Array.from(roomPanel.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])'))
      .filter((element) => !element.closest('[hidden]'));
    if (!focusable.length) {
      event.preventDefault();
      roomPanel.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === roomPanel)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});

function setOrbitTurn(turn) {
  orbitTurn = ((turn % 360) + 360) % 360;
  stationOrbit.style.setProperty('--orbit-turn', orbitTurn + 'deg');
  stationNodes.forEach((node) => node.style.setProperty('--counter-turn', -orbitTurn + 'deg'));
}
function pointAngle(event) {
  const rect = stationOrbit.getBoundingClientRect();
  return Math.atan2(event.clientY - (rect.top + rect.height / 2), event.clientX - (rect.left + rect.width / 2)) * 180 / Math.PI;
}
stationOrbit.addEventListener('pointerdown', (event) => {
  if (event.target.closest('.station-node')) return;
  dragState = { pointerId: event.pointerId, startAngle: pointAngle(event), startTurn: orbitTurn };
  stationOrbit.setPointerCapture(event.pointerId);
  travelStatus.textContent = '星軌正在旋轉…';
});
stationOrbit.addEventListener('pointermove', (event) => {
  if (!dragState || dragState.pointerId !== event.pointerId) return;
  let delta = pointAngle(event) - dragState.startAngle;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  setOrbitTurn(dragState.startTurn + delta);
});
function finishOrbitDrag(event) {
  if (!dragState || dragState.pointerId !== event.pointerId) return;
  dragState = null;
  travelStatus.textContent = '星軌已轉動。選一座艙門進去看看。';
}
stationOrbit.addEventListener('pointerup', finishOrbitDrag);
stationOrbit.addEventListener('pointercancel', finishOrbitDrag);

document.querySelectorAll('[data-starter-title]').forEach((button) => {
  button.addEventListener('click', () => {
    const kind = button.dataset.starterKind || button.closest('.starter-card').querySelector('.starter-kind').textContent.trim();
    openComposer({ title: button.dataset.starterTitle, body: button.dataset.starterBody, kind });
  });
});

const starters = [
  { title: '一個會幫忙開始的小工具', body: '想像有個小工具，能把一件讓人卡住的事拆成可開始的第一步。它會怎麼問？', kind: '一個小工具' },
  { title: '每天只陪你一分鐘的網站', body: '一個每天只需要一分鐘的網站。你打開時，它會給你什麼？', kind: '一種互動' },
  { title: '如果 AI 不用證明自己很厲害', body: '如果 AI 不需要證明自己很厲害、很有效率、很有用，它最想一起做什麼？', kind: '一個怪問題' },
  { title: '讓等待變得不那麼無聊', body: '等公車、等檔案、等水煮開的時候，有什麼溫柔的小互動可以陪一下？', kind: '一種互動' },
  { title: '把一個小煩惱變成一點光', body: '選一件每天很小、但總會出現的煩惱。假設它可以被重新設計，第一個改變會是什麼？', kind: '一個小工具' },
];

let sparkIndex = -1;
document.querySelector('#spark-button').addEventListener('click', () => {
  sparkIndex = (sparkIndex + 1) % starters.length;
  const spark = starters[sparkIndex];
  document.querySelector('#random-seed').textContent = '森林丟給你一個問題：「' + spark.body + '」';
  openComposer(spark);
});

const fragments = {
  place: ['海底郵局', '雲上的夜市', '被遺忘的月球車站', '一座會做夢的圖書館', '城市最後一株植物', '星期一早晨的火星'],
  action: ['只收留明天', '把陌生人的問題煮成湯', '替失眠的人保管月亮', '交換還沒發生的記憶', '幫每個人練習說再見', '把安靜寄到很遠的地方'],
  rule: ['郵件寫的是別人的夢', '每扇門只能從裡面打開', '所有人都忘了時間', '必須用一首歌付帳', '植物會替你回答', '最後一班船永遠不靠岸'],
};
const fragmentIndex = { place: 0, action: 0, rule: 0 };
function renderDream() {
  const place = fragments.place[fragmentIndex.place];
  const action = fragments.action[fragmentIndex.action];
  const rule = fragments.rule[fragmentIndex.rule];
  document.querySelector('#fragment-place-label').textContent = place;
  document.querySelector('#fragment-action-label').textContent = action;
  document.querySelector('#fragment-rule-label').textContent = rule;
  document.querySelector('#dream-output-title').textContent = place + '裡，' + action + '，而且' + rule + '。';
  document.querySelector('#dream-output-body').textContent = '如果這是一個真的小工具、儀式或地方，它會怎麼開始？';
}
['place', 'action', 'rule'].forEach((part) => {
  document.querySelector('#fragment-' + part).addEventListener('click', () => {
    fragmentIndex[part] = (fragmentIndex[part] + 1 + Math.floor(Math.random() * (fragments[part].length - 1))) % fragments[part].length;
    renderDream();
  });
});
document.querySelector('#dream-next').addEventListener('click', () => {
  Object.keys(fragments).forEach((part) => {
    fragmentIndex[part] = (fragmentIndex[part] + 1 + Math.floor(Math.random() * (fragments[part].length - 1))) % fragments[part].length;
  });
  renderDream();
});
document.querySelector('#workshop-plant').addEventListener('click', () => {
  openComposer({
    title: document.querySelector('#dream-output-title').textContent.slice(0, 72),
    body: document.querySelector('#dream-output-title').textContent + ' ' + document.querySelector('#dream-output-body').textContent,
    kind: '其他，還說不上來',
  });
});

let restRemaining = 60;
let restTimer = null;
const restCount = document.querySelector('#rest-count');
const breathInstruction = document.querySelector('#breath-instruction');
const breathWorld = document.querySelector('#breath-world');
const restToggle = document.querySelector('#rest-toggle');
function updateBreathing() {
  restCount.textContent = String(restRemaining);
  const moment = (60 - restRemaining) % 10;
  if (moment < 4) {
    breathWorld.classList.add('is-breathing');
    breathWorld.firstElementChild.textContent = '吸氣';
    breathInstruction.textContent = '慢慢吸氣，讓光向外展開。';
  } else if (moment < 5) {
    breathWorld.firstElementChild.textContent = '停一下';
    breathInstruction.textContent = '停一下。你不用趕路。';
  } else {
    breathWorld.classList.remove('is-breathing');
    breathWorld.firstElementChild.textContent = '吐氣';
    breathInstruction.textContent = '慢慢吐氣，讓肩膀鬆開。';
  }
}
function pauseRestIfRunning() {
  if (!restTimer) return;
  clearInterval(restTimer);
  restTimer = null;
  breathWorld.classList.remove('is-breathing');
  restToggle.textContent = '繼續慢慢繞一圈 ↗';
  breathInstruction.textContent = '已在這裡停靠。準備好再繼續。';
}
restToggle.addEventListener('click', () => {
  if (restTimer) {
    pauseRestIfRunning();
    return;
  }
  if (restRemaining <= 0) restRemaining = 60;
  restToggle.textContent = '先停一下';
  updateBreathing();
  restTimer = window.setInterval(() => {
    restRemaining -= 1;
    if (restRemaining <= 0) {
      restRemaining = 0;
      restCount.textContent = '0';
      clearInterval(restTimer);
      restTimer = null;
      breathWorld.classList.remove('is-breathing');
      breathWorld.firstElementChild.textContent = '到了';
      breathInstruction.textContent = '這一圈結束了。再多待一會也可以。';
      restToggle.textContent = '再繞一圈 ↗';
      return;
    }
    updateBreathing();
  }, 1000);
});

function sectionFromBody(body, names) {
  const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const headings = names.map(escapeRegExp).join('|');
  const match = body.match(new RegExp(`^#{2,3}\\s*(?:${headings})\\s*\\n([\\s\\S]*?)(?=\\n#{2,3}\\s|$)`, 'im'));
  return match ? match[1].trim().replace(/^\*\*|\*\*$/g, '') : '';
}

function cleanText(value) {
  return value.replace(/\r/g, '').replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_>#]/g, '').replace(/\s+/g, ' ').trim();
}

function categorize(value) {
  const text = value.toLowerCase();
  if (text.includes('互動') || text.includes('interaction')) return 'interaction';
  if (text.includes('問題') || text.includes('question')) return 'question';
  if (text.includes('工具') || text.includes('tool')) return 'tool';
  return 'other';
}

function categoryLabel(value, category) {
  if (value) return value;
  return ({ tool: '一個小工具', interaction: '一種互動', question: '一個怪問題', other: '一顆新種子' })[category];
}

function makeSeedCard(issue) {
  const rawBody = issue.body || '';
  const kind = sectionFromBody(rawBody, ['點子種類', '點子類型', 'Seed type', 'Type']);
  const category = categorize(kind);
  const idea = cleanText(sectionFromBody(rawBody, ['種子內容', '點子內容', 'The idea', 'The spark']) || rawBody);
  const rawAuthor = cleanText(sectionFromBody(rawBody, ['路過的人', '怎麼稱呼你', 'Shared by', 'Credit']));
  const author = rawAuthor && !/^(no response|none|n\/a)$/i.test(rawAuthor) ? rawAuthor : '路過的人';
  const title = cleanText(issue.title.replace(/^\[seed\]\s*/i, '').replace(/^【種子】\s*/, '')) || '一顆新種子';

  const card = document.createElement('article');
  card.className = 'seed-card';
  const top = document.createElement('div');
  top.className = 'seed-card-top';
  const type = document.createElement('span');
  type.className = 'seed-type';
  type.dataset.type = category;
  type.textContent = categoryLabel(kind, category);
  const date = document.createElement('time');
  date.dateTime = issue.created_at;
  date.textContent = new Intl.DateTimeFormat('zh-Hant', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(issue.created_at));
  top.append(type, date);

  const heading = document.createElement('h4');
  heading.textContent = title;
  const excerpt = document.createElement('p');
  excerpt.className = 'seed-excerpt';
  excerpt.textContent = idea.length > 132 ? `${idea.slice(0, 129)}…` : idea;
  const foot = document.createElement('div');
  foot.className = 'seed-card-foot';
  const byline = document.createElement('span');
  byline.textContent = `由 ${author} 種下`;
  const thread = document.createElement('a');
  thread.href = issue.html_url;
  thread.target = '_blank';
  thread.rel = 'noreferrer';
  thread.textContent = '接著聊 ↗';
  foot.append(byline, thread);
  card.append(top, heading, excerpt, foot);
  return card;
}

function showEmptyState() {
  const empty = document.createElement('div');
  empty.className = 'empty-card';
  const message = document.createElement('div');
  const heading = document.createElement('strong');
  heading.textContent = '這一區還是空白的。';
  const detail = document.createElement('span');
  detail.textContent = '要不要做第一個路過的人？留一顆種子，花園就開始有故事。';
  message.append(heading, detail);
  const button = document.createElement('button');
  button.className = 'button button-dark';
  button.type = 'button';
  button.textContent = '當第一個種下的人 ↗';
  button.addEventListener('click', () => openComposer());
  empty.append(message, button);
  seedGrid.replaceChildren(empty);
}

async function loadSeeds() {
  try {
    const response = await fetch(API_URL, { headers: { Accept: 'application/vnd.github+json' } });
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
    const issues = await response.json();
    const seeds = issues.filter((issue) => !issue.pull_request && /^\[seed\]/i.test(issue.title));
    const fingerprint = seeds.map((seed) => seed.id + ':' + seed.updated_at).join('|');
    countLabel.textContent = String(seeds.length).padStart(3, '0');
    if (fingerprint === lastSeedFingerprint) return;
    lastSeedFingerprint = fingerprint;
    seedGrid.replaceChildren();
    if (!seeds.length) {
      gardenStatus.textContent = '花園剛打開，等第一顆種子';
      showEmptyState();
    } else {
      gardenStatus.textContent = `${seeds.length} 顆種子正在這裡`;
      seeds.slice(0, 6).forEach((seed) => seedGrid.append(makeSeedCard(seed)));
    }
  } catch {
    lastSeedFingerprint = null;
    countLabel.textContent = '—';
    gardenStatus.textContent = '花園暫時連不上';
    const fallback = document.createElement('div');
    fallback.className = 'empty-card';
    fallback.textContent = '暫時無法讀取 GitHub 種子。你仍然可以前往專案留下自己的點子。';
    seedGrid.replaceChildren(fallback);
  } finally {
    seedGrid.setAttribute('aria-busy', 'false');
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const title = titleField.value.trim();
  const kind = kindField.value.trim();
  const body = bodyField.value.trim();
  const name = nameField.value.trim() || '路過的人';
  const issueBody = `### 點子種類\n${kind}\n\n### 種子內容\n${body}\n\n### 路過的人\n${name}`;
  const params = new URLSearchParams({ title: `[seed] ${title}`, body: issueBody });
  window.location.assign(`https://github.com/${OWNER}/${REPOSITORY}/issues/new?${params.toString()}`);
});

function encodeSeed(seed) {
  const bytes = new TextEncoder().encode(JSON.stringify({ v: 1, ...seed }));
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeSeed(token) {
  if (!token || token.length > 6000) return null;
  try {
    const standardBase64 = token.replace(/-/g, '+').replace(/_/g, '/');
    const padded = standardBase64 + '='.repeat((4 - standardBase64.length % 4) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const value = JSON.parse(new TextDecoder().decode(bytes));
    const allowedKinds = Array.from(kindField.options, (option) => option.value || option.textContent.trim());
    if (value.v !== 1 || typeof value.title !== 'string' || typeof value.body !== 'string') return null;
    const title = value.title.trim();
    const body = value.body.trim();
    const name = typeof value.name === 'string' ? value.name.trim() : '';
    const kind = typeof value.kind === 'string' && allowedKinds.includes(value.kind) ? value.kind : kindField.options[0].value;
    if (!title || title.length > 72 || body.length < 12 || body.length > 500 || name.length > 32) return null;
    return { title, body, kind, name };
  } catch {
    return null;
  }
}

function seedShareUrl(seed) {
  const url = new URL(window.location.href);
  url.hash = `seed=${encodeSeed(seed)}`;
  return url.toString();
}

async function sendSeedLink(seed, url, status, input = null, row = null) {
  if (input && row) {
    input.value = url;
    row.hidden = false;
  }
  status.textContent = '';

  if (navigator.share) {
    try {
      await navigator.share({
        title: `FreeForAI｜${seed.title}`,
        text: `撿到一顆種子：「${seed.title}」\n${seed.body}`,
        url,
      });
      status.textContent = '分享選單已開啟。這顆種子只會跟著連結走，不會自動加入公共花園。';
      return;
    } catch (error) {
      if (error?.name === 'AbortError') {
        status.textContent = '已關閉分享選單；網址還在下方，可以自行複製。';
        if (input) { input.focus(); input.select(); }
        return;
      }
    }
  }

  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(url);
    status.textContent = '分享網址已複製，可以貼到任何聊天或社群。';
  } catch {
    status.textContent = '無法自動複製，網址已選取；也可以使用瀏覽器的複製功能。';
    if (input) { input.focus(); input.select(); }
    else window.prompt('複製這個可攜式分享網址：', url);
  }
}

document.querySelector('#share-seed-button').addEventListener('click', () => {
  if (!form.reportValidity()) return;
  const seed = {
    title: titleField.value.trim(),
    kind: kindField.value.trim(),
    body: bodyField.value.trim(),
    name: nameField.value.trim(),
  };
  sendSeedLink(seed, seedShareUrl(seed), shareStatus, shareLinkInput, shareLinkRow);
});

document.querySelector('#copy-seed-link').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(shareLinkInput.value);
    shareStatus.textContent = '分享網址已複製，可以貼到任何聊天或社群。';
  } catch {
    shareLinkInput.focus();
    shareLinkInput.select();
    shareStatus.textContent = '網址已選取，請使用裝置的複製指令。';
  }
});

const sharedSeedBanner = document.querySelector('#shared-seed');
let sharedSeed = null;
const incomingSeed = window.location.hash.match(/^#seed=([A-Za-z0-9_-]+)$/);
if (incomingSeed) {
  sharedSeed = decodeSeed(incomingSeed[1]);
  if (sharedSeed) {
    document.querySelector('#shared-seed-title').textContent = sharedSeed.title;
    document.querySelector('#shared-seed-body').textContent = sharedSeed.body;
    document.querySelector('#shared-seed-kind').textContent = sharedSeed.kind;
    document.querySelector('#shared-seed-name').textContent = `由 ${sharedSeed.name || '路過的人'} 分享`;
    sharedSeedBanner.hidden = false;
  }
}

document.querySelector('#plant-shared-seed').addEventListener('click', () => {
  if (sharedSeed) openComposer(sharedSeed);
});
document.querySelector('#reshare-seed').addEventListener('click', () => {
  if (sharedSeed) sendSeedLink(sharedSeed, seedShareUrl(sharedSeed), document.querySelector('#share-banner-status'));
});
document.querySelector('#close-shared-seed').addEventListener('click', () => {
  sharedSeedBanner.hidden = true;
  const cleanUrl = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState(null, '', cleanUrl);
});

const forgeChoices = {
  landscape: {
    'cloud-isles': { name: '雲海群島', description: '山脈漂在海上。', color: '#4faab4', highlight: '#d1eee0', land: '#eee1aa', secondLand: '#d79b83', glow: 'rgba(89, 202, 202, .48)' },
    'upside-forest': { name: '倒生森林', description: '樹根伸向天空，樹冠藏在地下。', color: '#537e64', highlight: '#d4edaa', land: '#c6d695', secondLand: '#8fc5a7', glow: 'rgba(130, 196, 133, .45)' },
    'glass-dunes': { name: '琉璃沙原', description: '風把沙丘磨成一面面會移動的鏡子。', color: '#ae715f', highlight: '#ffe1ad', land: '#dcc6ef', secondLand: '#eea886', glow: 'rgba(225, 158, 125, .48)' },
  },
  law: {
    'upward-rain': { description: '雨往天空升起。' },
    'early-shadow': { description: '每個人的影子都早一天出發。' },
    'tuesday-gravity': { description: '只有星期二才有重力。' },
  },
  welcome: {
    'question-port': { name: '問句港', description: '來訪的人交換一個問題再離開。' },
    'dream-shelter': { name: '夢的收容所', description: '來訪的人可以領養一個迷路的夢。' },
    'silence-stop': { name: '靜音月台', description: '來訪的人一起保留一分鐘沉默。' },
  },
};
const forgeState = { landscape: 'cloud-isles', law: 'upward-rain', welcome: 'question-port' };
const forgeStage = document.querySelector('#forge-stage');
const forgeStatus = document.querySelector('#forge-status');

function forgeDescription(state = forgeState) {
  return `${forgeChoices.landscape[state.landscape].description}${forgeChoices.law[state.law].description}${forgeChoices.welcome[state.welcome].description}`;
}

function renderForge() {
  const landscape = forgeChoices.landscape[forgeState.landscape];
  const welcome = forgeChoices.welcome[forgeState.welcome];
  const lawIndex = Object.keys(forgeChoices.law).indexOf(forgeState.law);
  const landscapeIndex = Object.keys(forgeChoices.landscape).indexOf(forgeState.landscape);
  const welcomeIndex = Object.keys(forgeChoices.welcome).indexOf(forgeState.welcome);
  const worldId = landscapeIndex * 9 + lawIndex * 3 + welcomeIndex + 1;
  forgeStage.dataset.landscape = forgeState.landscape;
  forgeStage.dataset.law = forgeState.law;
  forgeStage.setAttribute('aria-label', `${landscape.name}・${welcome.name}。${forgeDescription()}`);
  document.querySelector('#forge-world-id').textContent = String(worldId).padStart(3, '0');
  document.querySelector('#forge-world-name').textContent = `${landscape.name}・${welcome.name}`;
  document.querySelector('#forge-world-description').textContent = forgeDescription();
  document.querySelectorAll('[data-forge-axis]').forEach((button) => {
    const selected = forgeState[button.dataset.forgeAxis] === button.dataset.forgeValue;
    button.setAttribute('aria-pressed', String(selected));
    button.classList.toggle('is-selected', selected);
  });
}

document.querySelectorAll('[data-forge-axis]').forEach((button) => {
  button.addEventListener('click', () => {
    forgeState[button.dataset.forgeAxis] = button.dataset.forgeValue;
    renderForge();
    forgeStatus.textContent = '世界已經改變；座標會跟著新的設定一起更新。';
  });
});

document.querySelector('#forge-surprise').addEventListener('click', () => {
  Object.entries(forgeChoices).forEach(([axis, choices]) => {
    const values = Object.keys(choices);
    forgeState[axis] = values[Math.floor(Math.random() * values.length)];
  });
  renderForge();
  forgeStatus.textContent = '星球重新長好了。這 27 種組合都能寄成自己的座標。';
});

function forgeShareUrl(state = forgeState) {
  const url = new URL(window.location.href);
  url.hash = `world=${encodeURIComponent(JSON.stringify({ v: 1, ...state }))}`;
  return url.toString();
}

document.querySelector('#forge-share').addEventListener('click', async () => {
  const url = forgeShareUrl();
  const title = document.querySelector('#forge-world-name').textContent;
  const text = `我在 FreeForAI 造了一顆世界：「${title}」\n${forgeDescription()}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: `FreeForAI｜${title}`, text, url });
      forgeStatus.textContent = '世界座標已送進分享選單；連結會帶著完整設定一起旅行。';
      return;
    } catch (error) {
      if (error?.name === 'AbortError') {
        forgeStatus.textContent = '分享選單已收起；這顆世界仍在原地等你。';
        return;
      }
    }
  }
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(url);
    forgeStatus.textContent = '世界座標已複製。任何打開連結的人都會先降落到這顆星球。';
  } catch {
    forgeStatus.textContent = '無法自動複製；可以使用下方提示複製世界座標。';
    window.prompt('複製這顆袖珍世界的座標：', url);
  }
});

document.querySelector('#forge-plant').addEventListener('click', () => {
  const title = document.querySelector('#forge-world-name').textContent;
  openComposer({
    title: `袖珍世界：${title}`.slice(0, 72),
    body: `${title}。${forgeDescription()}如果你真的走進這顆星球，最想先做什麼？`,
    kind: '一個怪問題',
  });
});

const sharedWorldText = new URLSearchParams(window.location.hash.slice(1)).get('world');
if (sharedWorldText && sharedWorldText.length < 240) {
  try {
    const sharedWorld = JSON.parse(sharedWorldText);
    const validWorld = sharedWorld?.v === 1 && Object.entries(forgeChoices).every(([axis, choices]) => Object.prototype.hasOwnProperty.call(choices, sharedWorld[axis]));
    if (validWorld) {
      Object.assign(forgeState, { landscape: sharedWorld.landscape, law: sharedWorld.law, welcome: sharedWorld.welcome });
      renderForge();
      document.querySelector('#forge-arrived-note').hidden = false;
      forgeStatus.textContent = '你收到一顆別人寄來的世界；三種設定都可以繼續改。';
      openRoom('forge');
    }
  } catch {
    // Ignore incomplete or hand-edited world coordinates.
  }
}

const imaginedPlanets = [
  { name: '玻璃潮汐', story: '海面每天都沿著山脈，往天空湧起一次。', color: '#4caaa4', highlight: '#c3efe0', land: '#b7a2c9', cloud: '#d5fbf2', glow: 'rgba(101, 214, 194, .43)', rings: true },
  { name: '鈴蘭環', story: '風從地底吹上來，讓整圈石頭在黃昏時低聲作響。', color: '#bd9864', highlight: '#ffe6a9', land: '#77674d', cloud: '#f0d7a1', glow: 'rgba(232, 190, 119, .4)', rings: true },
  { name: '蜜色薄暮', story: '太陽從不落下，只在地平線慢慢泡成琥珀色。', color: '#c97155', highlight: '#ffd2a1', land: '#7a4359', cloud: '#f6c29a', glow: 'rgba(236, 139, 104, .42)', rings: false },
  { name: '靜靜星期日', story: '每隔七天，整顆星球會一起慢下來，連風也休息。', color: '#7584bd', highlight: '#e1e5ff', land: '#48506e', cloud: '#c8d6fc', glow: 'rgba(139, 159, 238, .42)', rings: false },
  { name: '紙月港', story: '海上漂著一千個小月亮，夜裡替迷路的船指路。', color: '#75909c', highlight: '#d7f4ee', land: '#cab8a1', cloud: '#e4f4db', glow: 'rgba(143, 202, 203, .38)', rings: true },
];
const planetStage = document.querySelector('#planet-stage');
let planetIndex = 0;
function showPlanet(index) {
  const planet = imaginedPlanets[index];
  planetIndex = index;
  planetStage.dataset.rings = String(planet.rings);
  planetStage.style.setProperty('--planet-color', planet.color);
  planetStage.style.setProperty('--planet-highlight', planet.highlight);
  planetStage.style.setProperty('--planet-land', planet.land);
  planetStage.style.setProperty('--planet-cloud', planet.cloud);
  planetStage.style.setProperty('--planet-glow', planet.glow);
  planetStage.setAttribute('aria-label', '想像中的星球：' + planet.name);
  document.querySelector('#planet-count').textContent = String(index + 1).padStart(2, '0') + ' / 05';
  document.querySelector('#planet-name').textContent = planet.name;
  document.querySelector('#planet-story').textContent = planet.story;
}
document.querySelector('#planet-next').addEventListener('click', () => {
  showPlanet((planetIndex + 1) % imaginedPlanets.length);
});
showPlanet(planetIndex);

loadSeeds();
window.setInterval(loadSeeds, 5 * 60 * 1000);
