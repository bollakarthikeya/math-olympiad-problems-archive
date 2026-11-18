// Olympiad Problem Archive — browser app.
// data/index.js (loaded by index.html) defines window.DB:
//   years/countries/topics: [[name, count], ...]
//   p: [[id, year#, country#, [topic#...], solutionCount], ...] in default order (newest first)
// Each problem's text lives in data/p/<first 2 chars of id>/<id>.js and is loaded only when shown.
(() => {
const DB = window.DB, PER_OPTIONS = [20, 50, 100];
const YEARS = DB.years.map(x => x[0]), COUNTRIES = DB.countries.map(x => x[0]), TOPICS = DB.topics.map(x => x[0]);
const LABEL = { year:'Year', country:'Country / Competition', topic:'Topics' };
const OPTS = { year:DB.years, country:DB.countries, topic:DB.topics };
const NAMES = { year:YEARS, country:COUNTRIES, topic:TOPICS };
const KEY = { year:'y', country:'c', topic:'t' };
const fmt = n => n.toLocaleString('en-US');
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const chev = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>';
const arrow = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

const state = { year:new Set(), country:new Set(), topic:new Set(), q:'', sort:'new', seed:0, page:1, per:20 };

// ---- sort orders (indexes into DB.p), computed once
const yearNum = r => YEARS[r[1]] === 'Year Unknown' ? null : +YEARS[r[1]];
const idx = DB.p.map((_, i) => i);
const ORDER = {
  new: idx,
  old: idx.slice().sort((a, b) => {
    const ya = yearNum(DB.p[a]), yb = yearNum(DB.p[b]);
    if ((ya === null) !== (yb === null)) return ya === null ? 1 : -1;
    return (ya - yb) || (DB.p[a][2] - DB.p[b][2]) || (a - b);
  }),
  country: idx.slice().sort((a, b) => (DB.p[a][2] - DB.p[b][2]) || (a - b)),
};

document.getElementById('stats').innerHTML =
  `<a href="index.html" title="Show all problems"><b>${fmt(DB.p.length)}</b>problems</a>` +
  `<a href="countries.html" title="List of countries and contests"><b>${COUNTRIES.length}</b>countries & contests</a>` +
  `<a href="topics.html" title="List of topics"><b>${TOPICS.length}</b>topics</a>`;

// ---- URL <-> state  (e.g. #y=2023&t=Geometry&p=2)
function readHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  for (const k of ['year','country','topic']) state[k] = new Set(h.getAll(KEY[k]).filter(v => NAMES[k].includes(v)));
  state.q = h.get('q') || '';
  state.seed = parseInt(h.get('r')) || 0;
  state.sort = h.get('s') === 'random' && state.seed ? 'random' : ORDER[h.get('s')] ? h.get('s') : 'new';
  state.per = PER_OPTIONS.includes(+h.get('n')) ? +h.get('n') : 20;
  state.page = Math.max(1, parseInt(h.get('p')) || 1);
}
function writeHash(replace) {
  const h = new URLSearchParams();
  for (const k of ['year','country','topic']) for (const v of state[k]) h.append(KEY[k], v);
  if (state.q) h.set('q', state.q);
  if (state.sort !== 'new') h.set('s', state.sort);
  if (state.sort === 'random') h.set('r', state.seed);
  if (state.per !== 20) h.set('n', state.per);
  if (state.page > 1) h.set('p', state.page);
  const s = h.toString(), url = location.pathname + location.search + (s ? '#' + s : '');
  if (('#' + s) === location.hash || (!s && !location.hash)) return render();
  history[replace ? 'replaceState' : 'pushState'](null, '', url);
  render();
}
window.addEventListener('popstate', () => { readHash(); syncControls(); render(); });
function commit(opts = {}) { if (!opts.keepPage) state.page = 1; writeHash(opts.replace); }

// ---- lazy loading of problem files and the search index
const cache = {}, waiting = {};
window.__p = d => { cache[d.id] = d; (waiting[d.id] || []).forEach(f => f(d)); delete waiting[d.id]; };
function addScript(src, onerror) { const s = document.createElement('script'); s.src = src; s.onerror = onerror; document.head.appendChild(s); }
function loadProblem(id) {
  if (cache[id]) return Promise.resolve(cache[id]);
  return new Promise((res, rej) => {
    const first = !waiting[id]; (waiting[id] = waiting[id] || []).push(res);
    if (first) addScript(`data/p/${id.slice(0, 2)}/${id}.js`, () => rej(new Error('load failed')));
  });
}
let SEARCH = null, searchLoading = false;
window.__search = arr => { SEARCH = arr; searchLoading = false; render(); };
function needSearch() { if (!SEARCH && !searchLoading) { searchLoading = true; addScript('data/search.js'); } }

// ---- filtering
function results() {
  const y = new Set([...state.year].map(v => YEARS.indexOf(v)));
  const c = new Set([...state.country].map(v => COUNTRIES.indexOf(v)));
  const t = [...state.topic].map(v => TOPICS.indexOf(v));
  const q = state.q.trim().toLowerCase().replace(/^#/, '');
  const out = [];
  for (const i of ORDER[state.sort] || ORDER.new) {
    const r = DB.p[i];
    if (y.size && !y.has(r[1])) continue;
    if (c.size && !c.has(r[2])) continue;
    if (t.length && !t.some(x => r[3].includes(x))) continue;   // any of the chosen topics
    if (q && r[0] !== q && !(SEARCH && SEARCH[i].includes(q))) continue;
    out.push(i);
  }
  if (state.sort === 'random') shuffle(out, state.seed);
  return out;
}
// seeded Fisher-Yates shuffle, so a random order survives paging and can be shared as a link
function shuffle(arr, seed) {
  let s = seed >>> 0;
  const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
}

// ---- markdown + math
function md(text, imgs) {
  text = text.replace(/!\[[^\]]*\]\(attached_image_(\d+)\.png\)/g, (_, n) => imgs[n-1] ? `\n\n@@FIG${n-1}@@\n\n` : '');
  const math = [];
  text = text.replace(/\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$[^$\n]+?\$/g, m => `@@M${math.push(m)-1}@@`);
  let html = marked.parse(text);
  html = html.replace(/@@M(\d+)@@/g, (_, i) => esc(math[i]));
  return html.replace(/<p>@@FIG(\d+)@@<\/p>|@@FIG(\d+)@@/g, (_, a, b) => `<div class="fig"><img src="${imgs[a ?? b]}" alt="Figure" loading="lazy"></div>`);
}
const MATH = { delimiters:[{left:'$$',right:'$$',display:true},{left:'\\[',right:'\\]',display:true},{left:'\\(',right:'\\)',display:false},{left:'$',right:'$',display:false}], throwOnError:false };

// ---- rendering
function card(i, pos) {
  const [id, y, c, ts, n] = DB.p[i];
  return `<article class="card prob" data-id="${id}">
    <div class="meta"><span class="dot"></span><span>${esc(COUNTRIES[c])}</span><span>·</span><span>${esc(YEARS[y])}</span><span>·</span><span class="pid">ID: ${id}</span><span class="num">Problem ${fmt(pos)}</span></div>
    <h3 class="comp">&nbsp;</h3>
    <div class="stmt body"><p class="loading">Loading…</p></div>
    <div class="tags">${ts.map(t => `<button class="tag" data-t="${esc(TOPICS[t])}">${esc(TOPICS[t])}</button>`).join('')}</div>
    <div class="actions">
      ${n ? `<button class="pill sol-btn" type="button"><span>Show solution</span>${arrow}</button>` : '<span></span>'}
      <span class="nsol">${n ? `${n} solution${n === 1 ? '' : 's'}` : 'No solution provided'}</span>
    </div>
    <div class="sol"></div>
  </article>`;
}
function fill(el, d) {
  el.querySelector('.comp').textContent = d.competition || ' ';
  const body = el.querySelector('.body');
  body.innerHTML = md(d.problem, d.images);
  renderMathInElement(body, MATH);
}
function pager(total) {
  const pages = Math.ceil(total / state.per), p = state.page, el = document.getElementById('pager');
  if (pages <= 1) { el.innerHTML = ''; return; }
  const nums = new Set([1, pages, p - 2, p - 1, p, p + 1, p + 2].filter(x => x >= 1 && x <= pages));
  let html = `<button data-p="${p - 1}" ${p === 1 ? 'disabled' : ''} aria-label="Previous">‹</button>`, last = 0;
  for (const x of [...nums].sort((a, b) => a - b)) {
    if (x - last > 1) html += '<span>…</span>';
    html += `<button data-p="${x}" class="${x === p ? 'on' : ''}">${fmt(x)}</button>`; last = x;
  }
  el.innerHTML = html + `<button data-p="${p + 1}" ${p === pages ? 'disabled' : ''} aria-label="Next">›</button>`;
}
let renderToken = 0;
function render() {
  if (state.q) needSearch();
  const r = results(), pages = Math.max(1, Math.ceil(r.length / state.per));
  if (state.page > pages) state.page = pages;
  const from = (state.page - 1) * state.per;
  const shown = r.slice((state.page - 1) * state.per, state.page * state.per);
  const searching = state.q && !SEARCH;
  document.getElementById('count').innerHTML = searching ? 'Searching…'
    : !r.length ? '<b>0</b> problems match'
    : `Showing <b>${fmt(from + 1)}–${fmt(from + shown.length)}</b> of <b>${fmt(r.length)}</b> problems`;
  const list = document.getElementById('list');
  list.innerHTML = shown.length ? shown.map((i, k) => card(i, from + k + 1)).join('')
    : `<div class="card empty"><b>${searching ? 'Searching…' : 'No problems match these filters.'}</b>${searching ? '' : '<br>Try removing a filter or switching Topics to “Any”.'}</div>`;
  const token = ++renderToken;
  shown.forEach(i => {
    const id = DB.p[i][0];
    loadProblem(id).then(d => { if (token !== renderToken) return; const el = list.querySelector(`[data-id="${id}"]`); if (el) fill(el, d); })
      .catch(() => { const el = list.querySelector(`[data-id="${id}"] .body`); if (el) el.innerHTML = '<p class="loading">Could not load this problem.</p>'; });
  });
  pager(r.length);
  document.getElementById('idnote').hidden = !shown.length;
  drawChips();
}
function drawChips() {
  const chips = [];
  for (const k of ['year','country','topic']) for (const v of state[k])
    chips.push(`<span class="fchip"><small>${LABEL[k]}</small>${esc(v)}<button data-k="${k}" data-v="${esc(v)}" aria-label="Remove">×</button></span>`);
  document.getElementById('chips').innerHTML = chips.length ? chips.join('') + '<button class="clear" id="clearall">Clear all</button>' : '';
  document.querySelectorAll('.dd').forEach(dd => { const n = state[dd.dataset.key].size, b = dd.querySelector('.n'); b.hidden = !n; b.textContent = n; });
}

// ---- controls
const drawers = {};
document.querySelectorAll('.dd').forEach(dd => {
  const k = dd.dataset.key;
  dd.innerHTML = `<button class="dd-btn" type="button"><span>${LABEL[k]}</span><span class="n" hidden></span>${chev}</button>
    <div class="dd-panel"><input type="text" placeholder="Search ${LABEL[k].toLowerCase()}…"><div class="dd-list"></div>
    <div class="dd-foot"><span>${fmt(OPTS[k].length)} options</span><button type="button">Clear</button></div></div>`;
  const list = dd.querySelector('.dd-list'), input = dd.querySelector('input');
  const draw = drawers[k] = () => {
    const f = input.value.trim().toLowerCase();
    list.innerHTML = OPTS[k].filter(([v]) => v.toLowerCase().includes(f)).map(([v, c]) =>
      `<label class="opt"><input type="checkbox" value="${esc(v)}" ${state[k].has(v) ? 'checked' : ''}><span>${esc(v)}</span><em>${fmt(c)}</em></label>`).join('');
  };
  input.addEventListener('input', draw);
  list.addEventListener('change', e => { const v = e.target.value; e.target.checked ? state[k].add(v) : state[k].delete(v); commit(); });
  dd.querySelector('.dd-foot button').onclick = () => { state[k].clear(); draw(); commit(); };
  dd.querySelector('.dd-btn').onclick = e => { e.stopPropagation();
    document.querySelectorAll('.dd.open').forEach(o => o !== dd && o.classList.remove('open'));
    dd.classList.toggle('open'); if (dd.classList.contains('open')) { draw(); input.focus(); } };
  dd.querySelector('.dd-panel').addEventListener('click', e => e.stopPropagation());
});
document.addEventListener('click', () => document.querySelectorAll('.dd.open').forEach(o => o.classList.remove('open')));
document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('.dd.open').forEach(o => o.classList.remove('open')); });

const qInput = document.getElementById('q'), sortSel = document.getElementById('sort'), perSel = document.getElementById('per');
function syncControls() {
  qInput.value = state.q; sortSel.value = state.sort; perSel.value = state.per;
  Object.values(drawers).forEach(d => d());
}
document.getElementById('rand').onclick = () => {
  state.sort = 'random'; state.seed = 1 + Math.floor(Math.random() * 2147483646);
  syncControls(); commit();
};
let qTimer;
qInput.addEventListener('input', () => { clearTimeout(qTimer); qTimer = setTimeout(() => { state.q = qInput.value.trim(); commit({ replace:true }); }, 200); });
sortSel.onchange = () => { state.sort = sortSel.value; commit(); };
perSel.onchange = () => { state.per = +perSel.value; commit(); };
document.getElementById('chips').addEventListener('click', e => {
  if (e.target.id === 'clearall') { ['year','country','topic'].forEach(k => state[k].clear()); syncControls(); commit(); }
  else if (e.target.dataset.k) { state[e.target.dataset.k].delete(e.target.dataset.v); syncControls(); commit(); }
});
document.getElementById('pager').addEventListener('click', e => {
  const b = e.target.closest('button[data-p]'); if (!b || b.disabled) return;
  state.page = +b.dataset.p; commit({ keepPage:true });
  document.querySelector('.bar').scrollIntoView({ behavior:'smooth' });
});
document.getElementById('list').addEventListener('click', e => {
  const sb = e.target.closest('.sol-btn');
  if (sb) {
    const c = sb.closest('.prob'), d = cache[c.dataset.id], sol = c.querySelector('.sol');
    if (d && !sol.innerHTML) {
      const n = d.solutions.length;
      sol.innerHTML = d.solutions.map((s, j) => `<h4>Solution${n > 1 ? ' ' + (j + 1) : ''}</h4><div class="stmt">${md(s, d.images)}</div>`).join('');
      renderMathInElement(sol, MATH);
    }
    c.classList.toggle('show');
    sb.querySelector('span').textContent = c.classList.contains('show') ? 'Hide solution' : 'Show solution';
  }
  const tg = e.target.closest('.tag');
  if (tg) { state.topic.add(tg.dataset.t); syncControls(); commit(); }
});

readHash(); syncControls(); render();
})();
