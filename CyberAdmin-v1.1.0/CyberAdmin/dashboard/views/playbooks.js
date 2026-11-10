import { h, card, field, select, guard, toast, confirmDialog } from '../ui.js';
import { PLAYBOOKS, SECTIONS, getPlaybook, checklistItems, CHECKLIST_SECTIONS } from '../../modules/playbooks/playbooks.js';
import { loadChecklist, toggleItem, resetChecklist, progress } from '../../modules/playbooks/checklist.js';
import { listIncidents } from '../../modules/incidents/incidents.js';
import { pageHeader, sevBadge } from './shared.js';
import { buildPdf } from '../../modules/reports/pdf.js';
import { download } from '../ui.js';

export async function renderPlaybooks({ sub, params, go }) {
  if (sub[0]) return detail(sub[0], params.get('inc') || '', go);
  return h('div', {}, pageHeader('Protocolos de actuación', 'Procedimientos y checklists interactivos para administradores'),
    h('div', { class: 'grid g3' }, PLAYBOOKS.map((p) => h('div', { class: 'card pb', tabindex: 0, role: 'link', onclick: () => go('/playbooks/' + p.id), onkeydown: (e) => { if (e.key === 'Enter') go('/playbooks/' + p.id); } },
      sevBadge(p.severity), h('h4', {}, p.title), h('p', {}, p.what)))));
}
async function detail(id, incId, go) {
  const p = getPlaybook(id);
  if (!p) return h('div', { class: 'card' }, 'Protocolo no encontrado.');
  const incidents = (await listIncidents()).filter((i) => i.status !== 'closed');
  let cl = await loadChecklist(id, incId);
  const bar = h('i'), pct = h('b'), prog = () => progress(p, cl);
  const paint = () => { const pr = prog(); bar.style.width = pr.pct + '%'; pct.textContent = `${pr.done}/${pr.total} (${pr.pct}%)`; };
  const sel = select([['', 'Uso general (sin incidente)'], ...incidents.map((i) => [i.id, `${i.code} · ${i.title.slice(0, 50)}`])], incId, { 'aria-label': 'Vincular a incidente', onchange: (e) => go('/playbooks/' + id + (e.target.value ? '?inc=' + e.target.value : '')) });
  const sectionList = (key) => {
    if (key === 'what') return h('p', {}, p.what);
    const items = p[key];
    if (CHECKLIST_SECTIONS.includes(key)) return h('ul', { class: 'checklist' }, items.map((text, i) => {
      const k = `${key}.${i}`; const input = h('input', { type: 'checkbox', checked: !!cl.done[k] });
      const lab = h('label', { class: cl.done[k] ? 'done' : '' }, input, h('span', {}, text));
      input.addEventListener('change', () => guard(async () => { const r = await toggleItem(id, incId, k, input.checked); cl = r.cl; lab.className = input.checked ? 'done' : ''; paint(); }));
      return h('li', {}, lab);
    }));
    return h('ul', { class: key === 'dont' ? 'dont' : '' }, items.map((t) => h('li', {}, t)));
  };
  const root = h('div', {}, pageHeader(p.title, 'Protocolo de respuesta a incidentes', h('button', { class: 'btn', onclick: () => go('/playbooks') }, '← Protocolos')),
    card(null, h('div', {}, h('div', { class: 'row' }, h('div', { class: 'grow' }, field('Vincular checklist a incidente', sel)), h('div', { class: 'grow' }, h('div', {}, 'Progreso: ', pct), h('div', { class: 'bar-p' }, bar))),
      h('p', { class: 'warn' }, 'Las acciones de bloqueo, aislamiento o cambio en sistemas requieren autorización explícita y deben ejecutarse con las herramientas administrativas legítimas de tu organización. CyberAdmin no las ejecuta.'),
      h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => guard(async () => { if (await confirmDialog('Reiniciar checklist', 'Se desmarcarán todos los pasos.')) { await resetChecklist(id, incId); go('/playbooks/' + id + (incId ? '?inc=' + incId : '') + (incId ? '&' : '?') + 't=' + Date.now()); } }) }, 'Reiniciar checklist'),
        h('button', { class: 'btn', onclick: () => {
          const lines = [{ t: p.title, h: 1 }, ...SECTIONS.flatMap(([k, label]) => [{ t: label, h: 2 }, ...(k === 'what' ? [p.what] : p[k].map((t) => `${CHECKLIST_SECTIONS.includes(k) ? (cl.done[`${k}.${p[k].indexOf(t)}`] ? '[x] ' : '[ ] ') : '- '}${t}`)), ''])];
          download(`protocolo-${id}.pdf`, 'application/pdf', buildPdf('CyberAdmin - Protocolo: ' + p.title, lines));
        } }, 'Exportar PDF')))),
    ...SECTIONS.map(([k, label]) => card(label, h('div', { class: 'sec' }, sectionList(k)))));
  paint();
  return root;
}
