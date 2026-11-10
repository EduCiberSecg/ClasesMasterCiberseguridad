import { h, card, fmtDate, field, select, empty, guard, toast, modal } from '../ui.js';
import { listAlerts, markReviewed, markAllReviewed, createAlert, SEVERITIES, SEVERITY_LABEL } from '../../modules/alerts/alerts.js';
import { pageHeader, sevBadge } from './shared.js';

const TABS = [['critical', 'Críticas'], ['pending', 'Pendientes'], ['history', 'Historial (revisadas)'], ['all', 'Todas']];
export async function renderAlerts({ go }) {
  let tab = 'pending', sev = '';
  const body = h('div'), tabs = h('div', { class: 'tabs', role: 'tablist' });
  async function load() {
    tabs.replaceChildren(...TABS.map(([k, l]) => h('button', { class: 'tab' + (k === tab ? ' on' : ''), role: 'tab', 'aria-selected': k === tab, onclick: () => { tab = k; load(); } }, l)));
    let rows = await listAlerts({ severity: sev || undefined });
    if (tab === 'critical') rows = rows.filter((a) => a.severity === 'critical' && a.status === 'pending');
    else if (tab === 'pending') rows = rows.filter((a) => a.status === 'pending');
    else if (tab === 'history') rows = rows.filter((a) => a.status === 'reviewed').sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt));
    body.replaceChildren(rows.length ? rows.map((a) => h('div', { class: 'alert-i' + (a.status === 'reviewed' ? ' rev' : '') }, sevBadge(a.severity),
      h('div', { class: 't' }, h('b', {}, a.title), a.detail ? h('div', {}, a.detail) : null, h('small', {}, `${fmtDate(a.ts)} · origen: ${a.source}${a.ref ? ' · ' + a.ref : ''}${a.status === 'reviewed' ? ` · revisada por ${a.reviewedBy} (${fmtDate(a.reviewedAt)})` : ''}`)),
      a.status === 'pending' ? h('button', { class: 'btn small', onclick: () => guard(async () => { await markReviewed(a.id); load(); }) }, 'Marcar revisada') : null)) : empty('No hay alertas en esta vista.'));
  }
  const newAlert = () => guard(async () => {
    const t = h('input', { maxlength: 160 }), d = h('textarea', { maxlength: 1000 }), s = select(SEVERITIES.map((x) => [x, SEVERITY_LABEL[x]]), 'medium');
    const ok = await modal('Nueva alerta / notificación', h('div', {}, field('Título', t), field('Gravedad', s), field('Detalle', d)), [{ label: 'Cancelar', value: false }, { label: 'Crear', value: true, primary: true }]);
    if (ok) { await createAlert({ severity: s.value, title: t.value, detail: d.value }); toast('Alerta creada'); load(); }
  });
  const root = h('div', {}, pageHeader('Centro de alertas', 'Clasificación por gravedad y revisión', h('div', { class: 'row' },
    h('button', { class: 'btn', onclick: newAlert }, '+ Nueva alerta'), h('button', { class: 'btn', onclick: () => guard(async () => { const n = await markAllReviewed(); toast(`${n} alertas marcadas como revisadas`); load(); }) }, 'Marcar todas revisadas'))),
    card(null, h('div', {}, h('div', { class: 'row' }, tabs, select([['', 'Toda gravedad'], ...SEVERITIES.map((x) => [x, SEVERITY_LABEL[x]])], '', { 'aria-label': 'Gravedad', onchange: (e) => { sev = e.target.value; load(); } })), body)));
  await load();
  return root;
}
