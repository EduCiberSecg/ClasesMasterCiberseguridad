import { h, card, guard, download, toast } from '../ui.js';
import { collectData, buildReport, toJSON, toCSV, toPDF } from '../../modules/reports/reports.js';
import { log } from '../../modules/audit/audit.js';
import { CATEGORY_LABEL } from '../../modules/incidents/incidents.js';
import { pageHeader } from './shared.js';

export async function renderReports() {
  const data = await collectData();
  const report = await buildReport(data);
  const s = report.statistics;
  const stamp = new Date().toISOString().slice(0, 10);
  const exp = (kind, name, mime, make) => () => guard(async () => { download(`${name}-${stamp}.${kind}`, mime, make()); await log('report.export', { kind, incidents: report.incidents.length }); toast(`Informe ${kind.toUpperCase()} generado`); });
  return h('div', {}, pageHeader('Informes', 'Exportación de estadísticas, incidentes, amenazas y actuaciones'),
    h('div', { class: 'grid g2' }, card('Contenido del informe', h('dl', { class: 'kv' },
      h('dt', {}, 'Incidentes'), h('dd', {}, `${s.total} (${s.critical} críticos, ${s.pending} pendientes, ${s.resolved} resueltos)`), h('dt', {}, 'Nivel de riesgo'), h('dd', {}, `${s.risk.label} (${s.riskScore})`),
      h('dt', {}, 'Alertas'), h('dd', {}, `${report.alerts.length} (${s.pendingAlerts} pendientes)`), h('dt', {}, 'Análisis URL'), h('dd', {}, `${s.analysesTotal}`),
      h('dt', {}, 'Acciones'), h('dd', {}, `${report.actions.length} registradas en incidentes`), h('dt', {}, 'Categorías'), h('dd', {}, Object.entries(s.byCategory).map(([k, v]) => `${CATEGORY_LABEL[k] || k}: ${v}`).join(' · ') || '—'))),
      card('Descargar', h('div', {}, h('p', {}, 'Los informes se generan localmente en tu equipo. Las claves API nunca se incluyen.'),
        h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: exp('pdf', 'informe-seguridad', 'application/pdf', () => toPDF(report)) }, 'PDF'),
          h('button', { class: 'btn', onclick: exp('json', 'informe-seguridad', 'application/json', () => toJSON(report)) }, 'JSON'),
          h('button', { class: 'btn', onclick: exp('csv', 'incidentes', 'text/csv;charset=utf-8', () => toCSV(report)) }, 'CSV (incidentes)'))))));
}
