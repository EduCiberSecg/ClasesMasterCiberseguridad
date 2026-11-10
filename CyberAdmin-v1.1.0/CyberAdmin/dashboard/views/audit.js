import { h, card, fmtDate, field, empty, guard, download } from '../ui.js';
import { list, log } from '../../modules/audit/audit.js';
import { auditToCSV } from '../../modules/reports/reports.js';
import { pageHeader } from './shared.js';

export async function renderAudit() {
  const all = await list();
  const f = { action: '', actor: '', q: '' };
  const body = h('div');
  const actors = [...new Set(all.map((r) => r.actor))];
  const filtered = () => all.filter((r) => (!f.actor || r.actor === f.actor) && (!f.action || r.action.startsWith(f.action)) && (!f.q || (r.action + JSON.stringify(r.details)).toLowerCase().includes(f.q.toLowerCase())));
  function paint() {
    const rows = filtered();
    body.replaceChildren(rows.length ? h('div', { class: 'tw' }, h('table', {}, h('thead', {}, h('tr', {}, ['Fecha', 'Usuario', 'Acción', 'Detalles'].map((t) => h('th', {}, t)))),
      h('tbody', {}, rows.slice(0, 500).map((r) => h('tr', {}, h('td', {}, fmtDate(r.ts)), h('td', {}, r.actor), h('td', { class: 'mono' }, r.action), h('td', { class: 'mono' }, JSON.stringify(r.details))))))) : empty('Sin registros.'));
  }
  const exp = (kind) => () => guard(async () => {
    const rows = filtered(); await log('audit.export', { kind, rows: rows.length });
    if (kind === 'json') download('auditoria.json', 'application/json', JSON.stringify(rows, null, 2)); else download('auditoria.csv', 'text/csv;charset=utf-8', auditToCSV(rows));
  });
  const groups = ['incident', 'alert', 'phishing', 'playbook', 'report', 'audit', 'settings', 'data'];
  const root = h('div', {}, pageHeader('Auditoría y seguridad', 'Registro de acciones administrativas, cambios y análisis',
    h('div', { class: 'row' }, h('button', { class: 'btn', onclick: exp('csv') }, 'Exportar CSV'), h('button', { class: 'btn', onclick: exp('json') }, 'Exportar JSON'))),
    card(null, h('div', {}, h('p', { class: 'warn' }, 'Identidad: la extensión funciona sin autenticación corporativa; el «usuario» es el nombre de operador configurado localmente. La identificación fehaciente requiere integrar un proveedor de identidad (ver backend/).'),
      h('div', { class: 'row' }, h('input', { class: 'grow', type: 'search', placeholder: 'Buscar en la auditoría…', 'aria-label': 'Buscar', oninput: (e) => { f.q = e.target.value; paint(); } }),
        h('select', { 'aria-label': 'Tipo', onchange: (e) => { f.action = e.target.value; paint(); } }, h('option', { value: '' }, 'Todas las acciones'), groups.map((g) => h('option', { value: g }, g))),
        h('select', { 'aria-label': 'Usuario', onchange: (e) => { f.actor = e.target.value; paint(); } }, h('option', { value: '' }, 'Todos los usuarios'), actors.map((a) => h('option', { value: a }, a)))), body)));
  paint();
  return root;
}
