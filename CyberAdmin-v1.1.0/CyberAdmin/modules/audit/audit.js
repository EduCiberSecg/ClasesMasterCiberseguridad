import { put, getAll, newId } from '../../storage/db.js';
import { getSettings } from '../../storage/settings.js';
import { cleanText } from '../../utils/validate.js';

const SENSITIVE = /key|token|secret|password|passwd|authorization/i;
function redact(obj, depth = 0) {
  if (obj == null || depth > 3) return obj;
  if (Array.isArray(obj)) return obj.slice(0, 20).map((x) => redact(x, depth + 1));
  if (typeof obj === 'object') {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, SENSITIVE.test(k) ? '[REDACTADO]' : redact(v, depth + 1)]));
  }
  return typeof obj === 'string' ? obj.slice(0, 300) : obj;
}
export async function log(action, details = {}, actor) {
  const s = await getSettings();
  const entry = { id: newId(), ts: new Date().toISOString(), actor: cleanText(actor || s.operator, 64), action: cleanText(action, 80), details: redact(details) };
  await put('audit', entry);
  return entry;
}
export async function list({ action, actor, from, to } = {}) {
  let rows = await getAll('audit');
  if (action) rows = rows.filter((r) => r.action.startsWith(action));
  if (actor) rows = rows.filter((r) => r.actor === actor);
  if (from) rows = rows.filter((r) => r.ts >= from);
  if (to) rows = rows.filter((r) => r.ts <= to);
  return rows.sort((a, b) => b.ts.localeCompare(a.ts));
}
