import { h, card, fmtDate, empty, guard, toast } from '../ui.js';
import { donut, lineChart, barChart, PALETTE } from '../charts.js';
import { getAll } from '../../storage/db.js';
import { computeStats } from '../../modules/incidents/stats.js';
import { CATEGORY_LABEL } from '../../modules/incidents/incidents.js';
import { loadDemo } from '../../modules/incidents/demo.js';
import { listAlerts } from '../../modules/alerts/alerts.js';
import { pageHeader, sevBadge } from './shared.js';

const stat = (label, value, cls = '') => h('div', { class: `card stat ${cls}` }, h('div', { class: 'l' }, label), h('div', { class: 'v' }, value));

export async function renderDashboard({ go }) {
  const [incidents, alerts, audit, analyses] = await Promise.all(['incidents', 'alerts', 'audit', 'analyses'].map(getAll));
  const st = computeStats({ incidents, alerts, audit, analyses });
  const cats = Object.entries(st.byCategory).sort((a, b) => b[1] - a[1]).map(([k, v], i) => ({ label: CATEGORY_LABEL[k] || k, value: v, color: PALETTE[i % PALETTE.length] }));
  const recent = (await listAlerts()).sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 6);
  const root = h('div', {}, pageHeader('Dashboard', 'Visión general de la postura de seguridad'));
  if (!incidents.length && !alerts.length) {
    root.append(h('div', { class: 'card' }, h('h3', {}, 'Bienvenido a CyberAdmin'),
      h('p', {}, 'Aún no hay datos. Registra tu primer incidente, analiza una URL, o carga datos de demostración para explorar la herramienta.'),
      h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => go('/incidents/new') }, 'Registrar incidente'), h('button', { class: 'btn', onclick: () => go('/phishing') }, 'Analizar URL'),
        h('button', { class: 'btn', onclick: () => guard(async () => { await loadDemo(); toast('Datos de demostración cargados'); go('/'); location.reload(); }) }, 'Cargar datos de demostración'))));
  }
  root.append(h('div', { class: 'grid g4' },
    stat('Total de incidentes', st.total), stat('Incidentes críticos', st.critical, 'c-red'), stat('Pendientes', st.pending, 'c-amber'), stat('Resueltos', st.resolved, 'c-green'),
    h('div', { class: 'card stat' }, h('div', { class: 'l' }, 'Nivel de riesgo'), h('div', { class: `v risk-${st.risk.key}` }, st.risk.label), h('div', { class: 'l' }, `Puntuación ${st.riskScore}`))));
  root.append(h('div', { class: 'grid g2', }, card('Incidentes por categoría', cats.length ? donut(cats, { centerLabel: 'INCIDENTES' }) : empty('Sin datos')),
    card('Evolución de amenazas (14 días)', lineChart(st.incidentsPerDay, { label: 'Incidentes detectados por día' }))));
  root.append(h('div', { class: 'grid g2' },
    card('Actividad de seguridad (acciones + análisis)', barChart(st.activityPerDay)),
    card('Alertas recientes', recent.length ? recent.map((a) => h('div', { class: `alert-i ${a.status === 'reviewed' ? 'rev' : ''}` }, sevBadge(a.severity), h('div', { class: 't' }, a.title, h('br'), h('small', {}, fmtDate(a.ts)))))
      : empty('Sin alertas'), { right: h('button', { class: 'btn small', onclick: () => go('/alerts') }, 'Ver todas') })));
  return root;
}
