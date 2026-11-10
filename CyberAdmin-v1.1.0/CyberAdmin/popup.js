import { listIncidents } from './modules/incidents/incidents.js';
import { listAlerts } from './modules/alerts/alerts.js';
import { computeStats } from './modules/incidents/stats.js';
import { analyzeUrl } from './modules/phishing/analyzer.js';
import { put, newId } from './storage/db.js';
import { log } from './modules/audit/audit.js';

const $ = (id) => document.getElementById(id);
const open = (hash = '/') => { chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/index.html#' + hash) }); window.close(); };

function kpi(label, value) {
  const d = document.createElement('div'); d.className = 'k';
  const b = document.createElement('b'); b.textContent = String(value);
  const s = document.createElement('span'); s.textContent = label;
  d.append(b, s); return d;
}
async function init() {
  const [incidents, alerts] = await Promise.all([listIncidents(), listAlerts()]);
  const st = computeStats({ incidents, alerts });
  $('kpis').replaceChildren(kpi('Total', st.total), kpi('Críticos', st.critical), kpi('Pend.', st.pending), kpi('Alertas', st.pendingAlerts));
  const r = $('risk'); r.textContent = 'RIESGO ' + st.risk.label; r.className = 'risk ' + st.risk.key;
}
$('go').addEventListener('click', async () => {
  const res = analyzeUrl($('url').value);
  const box = $('result'); box.replaceChildren();
  if (res.error) { box.textContent = res.error; return; }
  const l = document.createElement('div');
  const s = document.createElement('span'); s.className = 'lvl ' + res.level; s.textContent = `Riesgo ${res.levelLabel} (${res.score}/100)`;
  l.append(s); box.append(l);
  const ul = document.createElement('ul');
  for (const f of res.indicators.filter((x) => x.weight > 0).slice(0, 4)) { const li = document.createElement('li'); li.textContent = f.title; ul.append(li); }
  box.append(ul);
  if (res.lowDisclaimer) { const p = document.createElement('div'); p.textContent = 'Sin indicadores locales; esto no garantiza que sea seguro.'; box.append(p); }
  await put('analyses', { id: newId(), ts: res.analyzedAt, input: res.input, score: res.score, level: res.level, levelLabel: res.levelLabel, indicators: res.indicators.map((i) => i.id), external: false });
  await log('phishing.analyze', { url: res.input.slice(0, 120), level: res.level, via: 'popup' });
});
$('url').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('go').click(); });
$('open').addEventListener('click', () => open('/'));
document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => open(b.dataset.go)));
init().catch((e) => { $('result').textContent = 'Error: ' + e.message; });
