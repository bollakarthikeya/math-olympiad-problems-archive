// Table pages (countries.html, topics.html). <body data-kind="countries|topics">.
// Reads window.DB from data/index.js: countries/topics = [[name, problemCount], ...]
(() => {
const DB = window.DB, kind = document.body.dataset.kind;
const CFG = {
  countries: { rows: DB.countries, col: 'Country / Competition', key: 'c', noun: 'countries & contests' },
  topics:    { rows: DB.topics,    col: 'Topic',                 key: 't', noun: 'topics' },
}[kind];
const fmt = n => n.toLocaleString('en-US');
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const base = CFG.rows.map(r => ({ name: r[0], n: r[1] }));
// default order: most problems first (ties A-Z)
let sort = { by: 'n', dir: -1 }, filter = '';

document.getElementById('total').textContent = fmt(base.length);
document.getElementById('col-name').textContent = CFG.col;

function draw() {
  const f = filter.toLowerCase();
  // the name must start with the typed text
  const rows = base.filter(r => r.name.toLowerCase().startsWith(f)).sort((a, b) => {
    const x = a[sort.by], y = b[sort.by];
    return ((typeof x === 'string' ? x.localeCompare(y) : x - y) * sort.dir) || a.name.localeCompare(b.name);
  });
  document.getElementById('rows').innerHTML = rows.map(r =>
    `<tr><td><a href="index.html#${CFG.key}=${encodeURIComponent(r.name)}" title="Show these problems">${esc(r.name)}</a></td><td class="ct">${fmt(r.n)}</td></tr>`).join('')
    || `<tr><td colspan="2">No ${CFG.noun} match “${esc(filter)}”.</td></tr>`;
  document.querySelectorAll('.tbl th').forEach(th =>
    th.querySelector('.ar').textContent = th.dataset.by === sort.by ? (sort.dir > 0 ? '↑' : '↓') : '');
  document.getElementById('shown').textContent = f ? `${fmt(rows.length)} of ${fmt(base.length)} shown` : 'Click a column title to sort · click a name to see its problems';
}
document.querySelectorAll('.tbl th').forEach(th => th.onclick = () => {
  const by = th.dataset.by;
  sort = sort.by === by ? { by, dir: -sort.dir } : { by, dir: by === 'n' ? -1 : 1 };
  draw();
});
document.getElementById('filter').addEventListener('input', e => { filter = e.target.value.trim(); draw(); });
draw();
})();
