import { put, get, getAll, del, newId, nextCounter } from '../../storage/db.js';
import { getSettings } from '../../storage/settings.js';
import { cleanText, oneOf, required, isoDate, ValidationError } from '../../utils/validate.js';
import { log } from '../audit/audit.js';
import { createAlert } from '../alerts/alerts.js';

export const CATEGORIES = ['phishing', 'ransomware', 'malware', 'credenciales', 'fuga-datos', 'acceso-no-autorizado', 'fuerza-bruta', 'cuenta-comprometida', 'vulnerabilidad', 'ddos', 'exposicion-servidores', 'perdida-dispositivo', 'otro'];
export const CATEGORY_LABEL = {
  phishing: 'Phishing', ransomware: 'Ransomware', malware: 'Malware', credenciales: 'Robo de credenciales', 'fuga-datos': 'Fuga de información',
  'acceso-no-autorizado': 'Acceso no autorizado', 'fuerza-bruta': 'Fuerza bruta', 'cuenta-comprometida': 'Cuenta comprometida',
  vulnerabilidad: 'Vulnerabilidad crítica', ddos: 'DDoS', 'exposicion-servidores': 'Exposición de servidores', 'perdida-dispositivo': 'Pérdida de dispositivo', otro: 'Otro'
};
export const PRIORITIES = ['critical', 'high', 'medium', 'low'];
export const PRIORITY_LABEL = { critical: 'Crítica', high: 'Alta', medium: 'Media', low: 'Baja' };
export const STATUSES = ['open', 'investigating', 'contained', 'resolved', 'closed'];
export const STATUS_LABEL = { open: 'Abierto', investigating: 'En investigación', contained: 'Contenido', resolved: 'Resuelto', closed: 'Cerrado' };
export const EVIDENCE_TYPES = ['log', 'captura', 'fichero', 'correo', 'red', 'memoria', 'otro'];
const TRACKED = ['title', 'description', 'category', 'priority', 'status', 'assignee'];

async function actor() { return (await getSettings()).operator; }
function addHistory(inc, who, field, from, to) {
  inc.history.push({ ts: new Date().toISOString(), actor: who, field, from: from ?? null, to: to ?? null });
}

export async function createIncident(d) {
  const who = await actor();
  const base = {
    title: required(d.title, 3, 200, 'Título'),
    description: cleanText(d.description, 5000),
    category: oneOf(d.category || 'otro', CATEGORIES, 'Categoría'),
    priority: oneOf(d.priority || 'medium', PRIORITIES, 'Prioridad'),
    assignee: cleanText(d.assignee, 100),
    detectedAt: isoDate(d.detectedAt, 'Fecha de detección')
  };
  const n = await nextCounter('incident');
  const inc = {
    id: newId(), code: `INC-${new Date().getFullYear()}-${String(n).padStart(4, '0')}`, ...base,
    status: 'open', createdAt: new Date().toISOString(), createdBy: who,
    evidence: [], actions: [], comments: [], history: [], closure: null, demo: !!d.demo, source: cleanText(d.source || 'manual', 40)
  };
  addHistory(inc, who, 'creado', null, inc.code);
  await put('incidents', inc);
  await log('incident.create', { code: inc.code, priority: inc.priority, category: inc.category }, who);
  if (!inc.demo && (inc.priority === 'critical' || inc.priority === 'high')) {
    await createAlert({ severity: inc.priority, title: `Nuevo incidente ${inc.priority === 'critical' ? 'crítico' : 'de prioridad alta'}: ${inc.title}`, source: 'incidentes', ref: inc.code });
  }
  return inc;
}

export async function updateIncident(id, patch) {
  const inc = await get('incidents', id);
  if (!inc) throw new ValidationError('Incidente no encontrado');
  if (inc.status === 'closed') throw new ValidationError('El incidente está cerrado; reábrelo para editarlo');
  const who = await actor();
  const clean = {};
  if ('title' in patch) clean.title = required(patch.title, 3, 200, 'Título');
  if ('description' in patch) clean.description = cleanText(patch.description, 5000);
  if ('category' in patch) clean.category = oneOf(patch.category, CATEGORIES, 'Categoría');
  if ('priority' in patch) clean.priority = oneOf(patch.priority, PRIORITIES, 'Prioridad');
  if ('assignee' in patch) clean.assignee = cleanText(patch.assignee, 100);
  if ('status' in patch) {
    clean.status = oneOf(patch.status, STATUSES, 'Estado');
    if (clean.status === 'closed') throw new ValidationError('Usa el formulario de cierre para cerrar el incidente');
  }
  for (const f of TRACKED) {
    if (f in clean && clean[f] !== inc[f]) { addHistory(inc, who, f, inc[f], f === 'description' ? '(modificada)' : clean[f]); inc[f] = clean[f]; }
  }
  await put('incidents', inc);
  await log('incident.update', { code: inc.code, fields: Object.keys(clean) }, who);
  return inc;
}

async function pushItem(id, kind, item, auditAction) {
  const inc = await get('incidents', id);
  if (!inc) throw new ValidationError('Incidente no encontrado');
  if (inc.status === 'closed') throw new ValidationError('El incidente está cerrado');
  const who = await actor();
  inc[kind].push({ id: newId(), ts: new Date().toISOString(), actor: who, ...item });
  addHistory(inc, who, auditAction, null, item.text || item.description || '');
  await put('incidents', inc);
  await log(`incident.${auditAction}`, { code: inc.code }, who);
  return inc;
}
export const addComment = (id, text) => pushItem(id, 'comments', { text: required(text, 1, 2000, 'Comentario') }, 'comentario');
export const addAction = (id, text) => pushItem(id, 'actions', { text: required(text, 3, 1000, 'Acción') }, 'accion');
export const addEvidence = (id, e) => pushItem(id, 'evidence', {
  type: oneOf(e.type || 'otro', EVIDENCE_TYPES, 'Tipo de evidencia'),
  description: required(e.description, 3, 1000, 'Descripción'),
  location: cleanText(e.location, 300), sha256: /^[a-f0-9]{64}$/i.test(e.sha256 || '') ? e.sha256.toLowerCase() : '',
  collectedAt: isoDate(e.collectedAt, 'Fecha de recogida')
}, 'evidencia');

export async function closeIncident(id, { resolution, lessons = '' }) {
  const inc = await get('incidents', id);
  if (!inc) throw new ValidationError('Incidente no encontrado');
  const who = await actor();
  const res = required(resolution, 5, 2000, 'Resolución');
  addHistory(inc, who, 'status', inc.status, 'closed');
  inc.status = 'closed';
  inc.closure = { ts: new Date().toISOString(), actor: who, resolution: res, lessons: cleanText(lessons, 2000) };
  await put('incidents', inc);
  await log('incident.close', { code: inc.code }, who);
  return inc;
}
export async function reopenIncident(id, reason) {
  const inc = await get('incidents', id);
  if (!inc || inc.status !== 'closed') throw new ValidationError('Solo se pueden reabrir incidentes cerrados');
  const who = await actor();
  const why = required(reason, 3, 500, 'Motivo');
  addHistory(inc, who, 'status', 'closed', 'investigating');
  inc.comments.push({ id: newId(), ts: new Date().toISOString(), actor: who, text: 'Reapertura: ' + why });
  inc.status = 'investigating'; inc.closure = null;
  await put('incidents', inc);
  await log('incident.reopen', { code: inc.code }, who);
  return inc;
}
export async function deleteIncident(id) {
  const inc = await get('incidents', id);
  if (!inc) return;
  await del('incidents', id);
  await log('incident.delete', { code: inc.code });
}
export const getIncident = (id) => get('incidents', id);
export async function listIncidents({ status, priority, category, q } = {}) {
  let rows = await getAll('incidents');
  if (status) rows = rows.filter((i) => i.status === status);
  if (priority) rows = rows.filter((i) => i.priority === priority);
  if (category) rows = rows.filter((i) => i.category === category);
  if (q) { const t = q.toLowerCase(); rows = rows.filter((i) => `${i.code} ${i.title} ${i.description} ${i.assignee}`.toLowerCase().includes(t)); }
  return rows.sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
}
