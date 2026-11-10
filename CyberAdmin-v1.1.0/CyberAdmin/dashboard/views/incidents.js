import { h, card, fmtDate, field, select, empty, guard, toast, modal, confirmDialog, download } from '../ui.js';
import * as I from '../../modules/incidents/incidents.js';
import { PLAYBOOKS } from '../../modules/playbooks/playbooks.js';
import { toPDF, toJSON, incidentReportPDF, buildReport } from '../../modules/reports/reports.js';
import { log } from '../../modules/audit/audit.js';
import { pageHeader, prioBadge, statusBadge } from './shared.js';

const opts = (list, labels, all) => [...(all ? [['', all]] : []), ...list.map((v) => [v, labels[v]])];

export async function renderIncidents({ sub, go }) {
  if (sub[0] === 'new') return newForm(go);
  if (sub[0]) return detail(sub[0], go);
  return list(go);
}
async function list(go) {
  const f = { q: '', status: '', priority: '', category: '' };
  const body = h('div');
  async function load() {
    const rows = await I.listIncidents(f);
    body.replaceChildren(rows.length ? h('div', { class: 'tw' }, h('table', {}, h('thead', {}, h('tr', {}, ['Código', 'Título', 'Categoría', 'Prioridad', 'Estado', 'Responsable', 'Detectado'].map((t) => h('th', {}, t)))),
      h('tbody', {}, rows.map((i) => h('tr', { class: 'click', tabindex: 0, onclick: () => go('/incidents/' + i.id), onkeydown: (e) => { if (e.key === 'Enter') go('/incidents/' + i.id); } },
        h('td', { class: 'mono' }, i.code), h('td', {}, i.title, i.demo ? h('small', {}, ' (demo)') : null), h('td', {}, I.CATEGORY_LABEL[i.category]), h('td', {}, prioBadge(i.priority)), h('td', {}, statusBadge(i.status)), h('td', {}, i.assignee || '—'), h('td', {}, fmtDate(i.detectedAt))))))) : empty('No hay incidentes que coincidan.'));
  }
  const on = (k) => (e) => { f[k] = e.target.value; load(); };
  const root = h('div', {}, pageHeader('Centro de respuesta a incidentes', 'Registro, seguimiento y cierre', h('button', { class: 'btn primary', onclick: () => go('/incidents/new') }, '+ Nuevo incidente')),
    card(null, h('div', {}, h('div', { class: 'row' }, h('input', { class: 'grow', type: 'search', placeholder: 'Buscar…', 'aria-label': 'Buscar', oninput: on('q') }),
      select(opts(I.STATUSES, I.STATUS_LABEL, 'Todos los estados'), '', { 'aria-label': 'Estado', onchange: on('status') }), select(opts(I.PRIORITIES, I.PRIORITY_LABEL, 'Todas las prioridades'), '', { 'aria-label': 'Prioridad', onchange: on('priority') }),
      select(opts(I.CATEGORIES, I.CATEGORY_LABEL, 'Todas las categorías'), '', { 'aria-label': 'Categoría', onchange: on('category') })), body)));
  await load();
  return root;
}
function newForm(go) {
  const toLocal = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const els = {
    title: h('input', { maxlength: 200, required: true }), description: h('textarea', { maxlength: 5000 }), category: select(opts(I.CATEGORIES, I.CATEGORY_LABEL), 'otro'),
    priority: select(opts(I.PRIORITIES, I.PRIORITY_LABEL), 'medium'), assignee: h('input', { maxlength: 100 }), detectedAt: h('input', { type: 'datetime-local', value: toLocal(new Date()) })
  };
  return h('div', {}, pageHeader('Nuevo incidente', 'Registro de incidente de seguridad'), card(null, h('div', {},
    field('Título', els.title), h('div', { class: 'grid g3' }, field('Categoría', els.category), field('Prioridad', els.priority), field('Fecha de detección', els.detectedAt)),
    field('Responsable asignado', els.assignee), field('Descripción', els.description),
    h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => guard(async () => {
      const inc = await I.createIncident({ title: els.title.value, description: els.description.value, category: els.category.value, priority: els.priority.value, assignee: els.assignee.value, detectedAt: els.detectedAt.value ? new Date(els.detectedAt.value).toISOString() : undefined });
      toast(`Incidente ${inc.code} creado`); go('/incidents/' + inc.id);
    }) }, 'Crear incidente'), h('button', { class: 'btn', onclick: () => go('/incidents') }, 'Cancelar')))));
}
async function sha256File(file) {
  const buf = await file.arrayBuffer();
  const d = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function detail(id, go) {
  const inc = await I.getIncident(id);
  if (!inc) return h('div', { class: 'card' }, empty('Incidente no encontrado.'), h('button', { class: 'btn', onclick: () => go('/incidents') }, 'Volver'));
  const closed = inc.status === 'closed';
  const refresh = () => go('/incidents/' + id + '?r=' + Date.now());
  const act = (fn) => () => guard(async () => { await fn(); refresh(); });
  const pb = PLAYBOOKS.find((p) => p.id === inc.category);

  const sStatus = select(opts(I.STATUSES.filter((s) => s !== 'closed'), I.STATUS_LABEL), inc.status, { disabled: closed });
  const sPrio = select(opts(I.PRIORITIES, I.PRIORITY_LABEL), inc.priority, { disabled: closed });
  const iAssignee = h('input', { value: inc.assignee, maxlength: 100, disabled: closed });
  const header = card(null, h('div', {}, h('div', { class: 'row' }, h('h2', { class: 'grow' }, `${inc.code} · ${inc.title}`), prioBadge(inc.priority), statusBadge(inc.status)),
    h('dl', { class: 'kv' }, h('dt', {}, 'Categoría'), h('dd', {}, I.CATEGORY_LABEL[inc.category]), h('dt', {}, 'Detectado'), h('dd', {}, fmtDate(inc.detectedAt)), h('dt', {}, 'Registrado por'), h('dd', {}, `${inc.createdBy} · ${fmtDate(inc.createdAt)}`), h('dt', {}, 'Descripción'), h('dd', {}, inc.description || '—')),
    h('div', { class: 'grid g3' }, field('Estado', sStatus), field('Prioridad', sPrio), field('Responsable', iAssignee)),
    h('div', { class: 'row' },
      h('button', { class: 'btn primary', disabled: closed, onclick: act(() => I.updateIncident(id, { status: sStatus.value, priority: sPrio.value, assignee: iAssignee.value })) }, 'Guardar cambios'),
      pb ? h('button', { class: 'btn', onclick: () => go('/playbooks/' + pb.id + '?inc=' + id) }, 'Abrir protocolo: ' + pb.title) : null,
      h('button', { class: 'btn', onclick: () => guard(async () => { download(`${inc.code}.pdf`, 'application/pdf', incidentReportPDF(inc)); await log('report.export', { kind: 'pdf', incident: inc.code }); }) }, 'Exportar PDF'),
      h('button', { class: 'btn', onclick: () => guard(async () => { download(`${inc.code}.json`, 'application/json', JSON.stringify(inc, null, 2)); await log('report.export', { kind: 'json', incident: inc.code }); }) }, 'Exportar JSON'),
      h('button', { class: 'btn danger', onclick: () => guard(async () => { if (await confirmDialog('Eliminar incidente', `Se eliminará ${inc.code} de forma permanente (queda constancia en auditoría).`, true)) { await I.deleteIncident(id); go('/incidents'); } }) }, 'Eliminar'))));

  const simpleAdd = (title, items, render, placeholder, onAdd) => {
    const ta = h('textarea', { placeholder, maxlength: 2000, disabled: closed });
    return card(title, h('div', {}, items.length ? items.map(render) : empty('Sin registros'),
      closed ? null : h('div', {}, ta, h('button', { class: 'btn small', onclick: act(() => onAdd(ta.value)) }, 'Añadir'))));
  };
  const item = (x, text) => h('div', { class: 'ind' }, h('small', {}, `${fmtDate(x.ts)} · ${x.actor}`), h('div', {}, text));

  const evDesc = h('input', { placeholder: 'Descripción de la evidencia', maxlength: 1000 }), evLoc = h('input', { placeholder: 'Ubicación / referencia (ruta, ticket, URL interna)', maxlength: 300 });
  const evType = select(opts(I.EVIDENCE_TYPES, Object.fromEntries(I.EVIDENCE_TYPES.map((t) => [t, t]))), 'log'), evFile = h('input', { type: 'file' });
  const evidence = card('Evidencias', h('div', {}, inc.evidence.length ? inc.evidence.map((e) => item(e, [`[${e.type}] ${e.description}`, e.location ? ` — ${e.location}` : '', e.sha256 ? h('div', { class: 'mono' }, 'SHA-256: ' + e.sha256) : null])) : empty('Sin evidencias'),
    closed ? null : h('div', {}, h('p', { class: 'warn' }, 'Registra referencias y hashes; el contenido del fichero NO se almacena (solo se calcula el SHA-256 localmente). Preserva el original con cadena de custodia.'),
      h('div', { class: 'grid g3' }, field('Tipo', evType), field('Descripción', evDesc), field('Ubicación', evLoc)), field('Fichero (opcional, para calcular hash)', evFile),
      h('button', { class: 'btn small', onclick: act(async () => { const f = evFile.files[0]; await I.addEvidence(id, { type: evType.value, description: evDesc.value || (f ? f.name : ''), location: evLoc.value, sha256: f ? await sha256File(f) : '' }); }) }, 'Añadir evidencia'))));

  const actions = simpleAdd('Acciones realizadas', inc.actions, (a) => item(a, a.text), 'Describe la acción realizada (qué, dónde, resultado)', (t) => I.addAction(id, t));
  const comments = simpleAdd('Comentarios', inc.comments, (c) => item(c, c.text), 'Añadir comentario…', (t) => I.addComment(id, t));
  const history = card('Historial de cambios', inc.history.length ? h('div', { class: 'timeline' }, [...inc.history].reverse().map((x) => h('div', {}, h('small', {}, `${fmtDate(x.ts)} · ${x.actor}`), h('div', {}, `${x.field}${x.to ? ': ' : ''}${x.from ? x.from + ' → ' : ''}${x.to ?? ''}`)))) : empty('Sin cambios'));

  const res = h('textarea', { placeholder: 'Resolución: qué se hizo y cómo se verificó', maxlength: 2000 }), les = h('textarea', { placeholder: 'Lecciones aprendidas', maxlength: 2000 });
  const closure = closed
    ? card('Cierre del incidente', h('div', {}, h('dl', { class: 'kv' }, h('dt', {}, 'Cerrado'), h('dd', {}, `${fmtDate(inc.closure.ts)} por ${inc.closure.actor}`), h('dt', {}, 'Resolución'), h('dd', {}, inc.closure.resolution), h('dt', {}, 'Lecciones'), h('dd', {}, inc.closure.lessons || '—')),
      h('button', { class: 'btn', onclick: () => guard(async () => { const inp = h('input', { maxlength: 500 }); const ok = await modal('Reabrir incidente', field('Motivo de la reapertura', inp), [{ label: 'Cancelar', value: false }, { label: 'Reabrir', value: true, primary: true }]); if (ok) { await I.reopenIncident(id, inp.value); refresh(); } }) }, 'Reabrir')))
    : card('Cierre del incidente', h('div', {}, field('Resolución', res), field('Lecciones aprendidas', les), h('button', { class: 'btn danger', onclick: act(async () => { if (!(await confirmDialog('Cerrar incidente', 'Tras el cierre no podrá editarse salvo reapertura.'))) throw new Error('Cierre cancelado'); await I.closeIncident(id, { resolution: res.value, lessons: les.value }); }) }, 'Cerrar incidente')));

  return h('div', {}, pageHeader('Incidente', 'Detalle y trazabilidad', h('button', { class: 'btn', onclick: () => go('/incidents') }, '← Volver')), header,
    h('div', { class: 'grid g2' }, evidence, actions), h('div', { class: 'grid g2' }, comments, history), closure);
}
