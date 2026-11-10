import test from 'node:test';
import assert from 'node:assert/strict';
import { reset } from './helpers.mjs';
import { createIncident } from '../modules/incidents/incidents.js';
import { buildReport, toCSV, toJSON, toPDF, incidentReportPDF } from '../modules/reports/reports.js';
import { buildPdf } from '../modules/reports/pdf.js';
import { computeStats, riskFromScore } from '../modules/incidents/stats.js';
import { setSettings } from '../storage/settings.js';
import { csvCell } from '../utils/validate.js';

test('PDF válido con xref y múltiples páginas', () => {
  const lines = Array.from({ length: 200 }, (_, i) => `Línea ${i} con acentos áéíóú ñ y paréntesis ( ) \\`);
  const b = buildPdf('Título (test)', lines); const s = Buffer.from(b).toString('latin1');
  assert.ok(s.startsWith('%PDF-1.4') && s.trimEnd().endsWith('%%EOF'));
  const pages = (s.match(/\/Type \/Page /g) || []).length; assert.ok(pages >= 3);
  const xref = Number(s.match(/startxref\n(\d+)/)[1]); assert.ok(s.slice(xref).startsWith('xref'));
  // offsets de objetos correctos
  const offs = [...s.slice(xref).matchAll(/(\d{10}) 00000 n/g)].map((m) => Number(m[1]));
  offs.forEach((o, i) => assert.ok(s.slice(o).startsWith(`${i + 1} 0 obj`), `offset objeto ${i + 1}`));
});
test('CSV neutraliza inyección de fórmulas', () => {
  assert.equal(csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"'); assert.equal(csvCell('+1'), "'+1"); assert.equal(csvCell('normal'), 'normal');
});
test('informes JSON/CSV/PDF con datos y sin claves', async () => {
  await reset(); await setSettings({ safeBrowsingKey: 'TOPSECRETKEY' });
  await createIncident({ title: '=cmd|calc', category: 'malware', priority: 'high' });
  const r = await buildReport();
  const json = toJSON(r); assert.ok(!json.includes('TOPSECRETKEY')); assert.equal(JSON.parse(json).statistics.total, 1);
  assert.ok(toCSV(r).includes("'=cmd|calc"));
  assert.ok(Buffer.from(toPDF(r)).toString('latin1').startsWith('%PDF'));
  assert.ok(incidentReportPDF(r.incidents[0]).length > 500);
});
test('estadísticas y nivel de riesgo', () => {
  const now = Date.parse('2026-11-10T12:00:00Z');
  const inc = (priority, status, d) => ({ priority, status, category: 'malware', detectedAt: d });
  const st = computeStats({ incidents: [inc('critical', 'open', '2026-11-10T01:00:00Z'), inc('high', 'resolved', '2026-11-09T01:00:00Z'), inc('low', 'closed', '2026-10-01T00:00:00Z')], alerts: [{ severity: 'critical', status: 'pending' }] }, now);
  assert.equal(st.total, 3); assert.equal(st.critical, 1); assert.equal(st.pending, 1); assert.equal(st.resolved, 2); assert.equal(st.riskScore, 15);
  assert.equal(st.incidentsPerDay.length, 14); assert.equal(st.incidentsPerDay.at(-1).value, 1);
  assert.equal(riskFromScore(0).key, 'low'); assert.equal(riskFromScore(100).key, 'critical');
});
