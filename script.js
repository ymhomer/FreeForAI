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
  button.addEventListener('click', () => openComposer());
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

document.querySelectorAll('[data-starter-title]').forEach((button) => {
  button.addEventListener('click', () => {
    const kind = button.closest('.starter-card').querySelector('.starter-kind').textContent.trim();
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
  document.querySelector('#random-seed').textContent = spark.body;
  openComposer(spark);
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

const menuToggle = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('#mobile-nav');
menuToggle.addEventListener('click', () => {
  const willOpen = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.setAttribute('aria-expanded', String(willOpen));
  menuToggle.setAttribute('aria-label', willOpen ? '關閉導覽選單' : '開啟導覽選單');
  mobileNav.hidden = !willOpen;
});
mobileNav.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', '開啟導覽選單');
    mobileNav.hidden = true;
  });
});

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
