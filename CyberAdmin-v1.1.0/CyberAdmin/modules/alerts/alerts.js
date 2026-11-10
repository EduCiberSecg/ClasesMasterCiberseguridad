import { put, get, getAll, newId } from '../../storage/db.js';
import { cleanText, oneOf, required } from '../../utils/validate.js';
import { log } from '../audit/audit.js';
import { getSettings } from '../../storage/settings.js';

export const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'];
export const SEVERITY_LABEL = { critical: 'Crítica', high: 'Alta', medium: 'Media', low: 'Baja', info: 'Info' };
const RANK = Object.fromEntries(SEVERITIES.map((s, i) => [s, i]));

export async function createAlert({ severity, title, detail = '', source = 'manual', ref = null }) {
  const a = {
    id: newId(), ts: new Date().toISOString(),
    severity: oneOf(severity, SEVERITIES, 'Gravedad'),
    title: required(title, 3, 160, 'Título'),
    detail: cleanText(detail, 1000), source: cleanText(source, 40), ref: ref ? cleanText(ref, 80) : null,
    status: 'pending', reviewedAt: null, reviewedBy: null
  };
  await put('alerts', a);
  await log('alert.create', { id: a.id, severity: a.severity, title: a.title });
  if ((a.severity === 'critical' || a.severity === 'high') && globalThis.chrome?.notifications?.create) {
    try {
      globalThis.chrome.notifications.create(`alert-${a.id}`, {
        type: 'basic', iconUrl: globalThis.chrome.runtime.getURL('assets/icons/icon128.png'),
        title: `CyberAdmin · Alerta ${SEVERITY_LABEL[a.severity]}`, message: a.title
      });
    } catch { /* las notificaciones son opcionales */ }
  }
  return a;
}
export async function markReviewed(id, note = '') {
  const a = await get('alerts', id);
  if (!a) throw new Error('Alerta no encontrada');
  if (a.status === 'reviewed') return a;
  const s = await getSettings();
  a.status = 'reviewed'; a.reviewedAt = new Date().toISOString(); a.reviewedBy = s.operator; a.note = cleanText(note, 300);
  await put('alerts', a);
  await log('alert.review', { id });
  return a;
}
export async function markAllReviewed() {
  const pend = (await getAll('alerts')).filter((a) => a.status === 'pending');
  for (const a of pend) await markReviewed(a.id);
  return pend.length;
}
export async function listAlerts({ status, severity } = {}) {
  let rows = await getAll('alerts');
  if (status) rows = rows.filter((a) => a.status === status);
  if (severity) rows = rows.filter((a) => a.severity === severity);
  return rows.sort((a, b) => RANK[a.severity] - RANK[b.severity] || b.ts.localeCompare(a.ts));
}
export const countPendingCritical = async () => (await getAll('alerts')).filter((a) => a.status === 'pending' && (a.severity === 'critical' || a.severity === 'high')).length;
