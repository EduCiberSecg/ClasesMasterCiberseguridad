import { get, put } from '../../storage/db.js';
import { getPlaybook, checklistItems } from './playbooks.js';
import { log } from '../audit/audit.js';
import { getSettings } from '../../storage/settings.js';

const keyOf = (pid, incidentId) => `${pid}::${incidentId || 'general'}`;
export async function loadChecklist(pid, incidentId) {
  return (await get('checklists', keyOf(pid, incidentId))) || { id: keyOf(pid, incidentId), playbook: pid, incident: incidentId || null, done: {}, updatedAt: null };
}
export async function toggleItem(pid, incidentId, itemKey, value) {
  const p = getPlaybook(pid);
  if (!p) throw new Error('Protocolo no encontrado');
  if (!checklistItems(p).some((i) => i.key === itemKey)) throw new Error('Elemento no válido');
  const cl = await loadChecklist(pid, incidentId);
  const who = (await getSettings()).operator;
  if (value) cl.done[itemKey] = { ts: new Date().toISOString(), actor: who }; else delete cl.done[itemKey];
  cl.updatedAt = new Date().toISOString();
  await put('checklists', cl);
  const prog = progress(p, cl);
  if (prog.pct === 100 && value) await log('playbook.complete', { playbook: pid, incident: incidentId || null }, who);
  return { cl, prog };
}
export async function resetChecklist(pid, incidentId) {
  await put('checklists', { id: keyOf(pid, incidentId), playbook: pid, incident: incidentId || null, done: {}, updatedAt: new Date().toISOString() });
  await log('playbook.reset', { playbook: pid, incident: incidentId || null });
}
export function progress(p, cl) {
  const items = checklistItems(p);
  const done = items.filter((i) => cl.done[i.key]).length;
  return { done, total: items.length, pct: items.length ? Math.round((done / items.length) * 100) : 0 };
}
