import { h, icon, toast } from './ui.js';
import { countPendingCritical } from '../modules/alerts/alerts.js';
import { getSettings } from '../storage/settings.js';
import { renderDashboard } from './views/dashboard.js';
import { renderPhishing } from './views/phishing.js';
import { renderIncidents } from './views/incidents.js';
import { renderAlerts } from './views/alerts.js';
import { renderPlaybooks } from './views/playbooks.js';
import { renderAudit } from './views/audit.js';
import { renderReports } from './views/reports.js';
import { renderAssistant } from './views/assistant.js';
import { renderSettings } from './views/settings.js';

export const ROUTES = [
  ['/', 'Dashboard', 'dashboard', renderDashboard], ['/phishing', 'Analizador de phishing', 'phishing', renderPhishing],
  ['/incidents', 'Incidentes', 'incidents', renderIncidents], ['/alerts', 'Alertas', 'alerts', renderAlerts],
  ['/playbooks', 'Protocolos', 'playbooks', renderPlaybooks], ['/audit', 'Auditoría', 'audit', renderAudit],
  ['/reports', 'Informes', 'reports', renderReports], ['/assistant', 'Asistente IA', 'assistant', renderAssistant], ['/settings', 'Configuración', 'settings', renderSettings]
];
export function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, qs = ''] = raw.split('?');
  return { path, params: new URLSearchParams(qs) };
}
export const go = (path) => { location.hash = path; };
let seq = 0;
async function render() {
  const { path, params } = parseHash();
  const parts = path.split('/').filter(Boolean);
  const base = '/' + (parts[0] || '');
  const route = ROUTES.find((r) => r[0] === base) || ROUTES[0];
  const my = ++seq;
  const main = document.getElementById('main');
  try {
    const view = await route[3]({ params, sub: parts.slice(1), go });
    if (my !== seq) return; // navegación más reciente en curso
    main.replaceChildren(view);
  } catch (e) {
    console.error(e);
    main.replaceChildren(h('div', { class: 'card' }, h('h3', {}, 'Error al cargar la vista'), h('p', {}, e.message || String(e))));
  }
  await buildNav(route[0]);
  main.focus({ preventScroll: true });
}
async function buildNav(active) {
  const n = await countPendingCritical().catch(() => 0);
  const nav = document.getElementById('nav');
  nav.replaceChildren(...ROUTES.map(([p, label, ic]) => h('a', { href: '#' + p, class: p === active ? 'active' : '', 'aria-current': p === active ? 'page' : null }, icon(ic), label, p === '/alerts' && n ? h('span', { class: 'count' }, n) : null)));
  const s = await getSettings();
  document.getElementById('foot').textContent = `Operador: ${s.operator} · v1.1.0`;
  if (globalThis.chrome?.runtime?.sendMessage) chrome.runtime.sendMessage({ type: 'refresh-badge' }).catch(() => {});
}
window.addEventListener('hashchange', render);
window.addEventListener('unhandledrejection', (e) => toast(e.reason?.message || 'Error inesperado', 'err'));
render();
