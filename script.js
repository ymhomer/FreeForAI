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

function openComposer({ title = '', body = '', kind = '' } = {}) {
  if (title) titleField.value = title;
  if (body) bodyField.value = body;
  if (kind) kindField.value = kind;
  countField.textContent = String(bodyField.value.length);
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
  const author = cleanText(sectionFromBody(rawBody, ['路過的人', '怎麼稱呼你', 'Shared by', 'Credit'])) || '路過的人';
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
    countLabel.textContent = String(seeds.length).padStart(3, '0');
    seedGrid.replaceChildren();
    if (!seeds.length) {
      gardenStatus.textContent = '花園剛打開，等第一顆種子';
      showEmptyState();
    } else {
      gardenStatus.textContent = `${seeds.length} 顆種子正在這裡`;
      seeds.slice(0, 6).forEach((seed) => seedGrid.append(makeSeedCard(seed)));
    }
  } catch {
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

loadSeeds();
