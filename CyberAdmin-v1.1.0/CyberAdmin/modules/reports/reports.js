import { getAll } from '../../storage/db.js';
import { computeStats } from '../incidents/stats.js';
import { CATEGORY_LABEL, PRIORITY_LABEL, STATUS_LABEL } from '../incidents/incidents.js';
import { csvCell } from '../../utils/validate.js';
import { buildPdf } from './pdf.js';
import { log } from '../audit/audit.js';
import { getSettings } from '../../storage/settings.js';

export async function collectData() {
  const [incidents, alerts, audit, analyses] = await Promise.all(['incidents', 'alerts', 'audit', 'analyses'].map(getAll));
  incidents.sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
  return { incidents, alerts, audit, analyses };
}
export async function buildReport(data) {
  const d = data || (await collectData());
  const s = await getSettings();
  return {
    meta: { product: 'CyberAdmin Security Center', version: '1.0.0', generatedAt: new Date().toISOString(), generatedBy: s.operator },
    statistics: computeStats(d),
    incidents: d.incidents, alerts: d.alerts, phishingAnalyses: d.analyses,
    actions: d.incidents.flatMap((i) => i.actions.map((a) => ({ incident: i.code, ts: a.ts, actor: a.actor, text: a.text }))),
    audit: d.audit
  };
}
export const toJSON = (report) => JSON.stringify(report, null, 2);

export function toCSV(report) {
  const head = ['codigo', 'titulo', 'categoria', 'prioridad', 'estado', 'responsable', 'detectado', 'evidencias', 'acciones', 'comentarios', 'cierre'];
  const rows = report.incidents.map((i) => [i.code, i.title, CATEGORY_LABEL[i.category] || i.category, PRIORITY_LABEL[i.priority], STATUS_LABEL[i.status], i.assignee, i.detectedAt, i.evidence.length, i.actions.length, i.comments.length, i.closure ? i.closure.resolution : '']);
  return '\ufeff' + [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
}
export function auditToCSV(rows) {
  return '\ufeff' + [['fecha', 'usuario', 'accion', 'detalles'], ...rows.map((r) => [r.ts, r.actor, r.action, JSON.stringify(r.details)])].map((r) => r.map(csvCell).join(',')).join('\r\n');
}

export function toPDF(report) {
  const s = report.statistics;
  const L = [];
  const H1 = (t) => L.push({ t, h: 1 }), H2 = (t) => L.push({ t, h: 2 }), P = (t) => L.push(t);
  H1('Informe de seguridad'); P(`Generado: ${report.meta.generatedAt}  |  Usuario: ${report.meta.generatedBy}`); P('');
  H2('Resumen ejecutivo');
  P(`Incidentes totales: ${s.total}  |  Criticos: ${s.critical}  |  Pendientes: ${s.pending}  |  Resueltos/cerrados: ${s.resolved}`);
  P(`Nivel de riesgo: ${s.risk.label} (puntuacion ${s.riskScore})  |  Alertas pendientes: ${s.pendingAlerts}`);
  P(`Analisis de URL realizados: ${s.analysesTotal} (riesgo alto/critico: ${s.analysesHigh})`); P('');
  H2('Clasificacion de amenazas por categoria');
  const cats = Object.entries(s.byCategory).sort((a, b) => b[1] - a[1]);
  if (!cats.length) P('Sin incidentes registrados.');
  for (const [k, v] of cats) P(`  - ${CATEGORY_LABEL[k] || k}: ${v}`);
  P(''); H2('Incidentes');
  if (!report.incidents.length) P('Sin incidentes registrados.');
  for (const i of report.incidents) {
    P(`${i.code} - ${i.title}`);
    P(`  Categoria: ${CATEGORY_LABEL[i.category]} | Prioridad: ${PRIORITY_LABEL[i.priority]} | Estado: ${STATUS_LABEL[i.status]} | Responsable: ${i.assignee || 'sin asignar'} | Detectado: ${i.detectedAt}`);
    if (i.description) P(`  Descripcion: ${i.description}`);
    for (const e of i.evidence) P(`  Evidencia [${e.type}]: ${e.description}${e.sha256 ? ' SHA-256 ' + e.sha256 : ''}`);
    for (const a of i.actions) P(`  Accion (${a.ts.slice(0, 16)} ${a.actor}): ${a.text}`);
    if (i.closure) P(`  Cierre (${i.closure.ts.slice(0, 16)}): ${i.closure.resolution}`);
    P('');
  }
  H2('Analisis de phishing recientes');
  if (!report.phishingAnalyses.length) P('Sin analisis.');
  for (const a of report.phishingAnalyses.slice(0, 40)) P(`  ${a.ts.slice(0, 16)}  ${a.levelLabel} (${a.score})  ${a.input}`);
  P(''); H2('Alertas');
  if (!report.alerts.length) P('Sin alertas.');
  for (const a of report.alerts.slice(0, 60)) P(`  ${a.ts.slice(0, 16)} [${a.severity}] ${a.title} - ${a.status === 'reviewed' ? 'revisada' : 'pendiente'}`);
  return buildPdf('CyberAdmin - Informe de seguridad', L);
}
export function incidentReportPDF(i) {
  return toPDF({ meta: { generatedAt: new Date().toISOString(), generatedBy: '' }, statistics: computeStats({ incidents: [i] }), incidents: [i], alerts: [], phishingAnalyses: [] });
}
export async function auditExport(kind) { await log('report.export', { kind }); }
