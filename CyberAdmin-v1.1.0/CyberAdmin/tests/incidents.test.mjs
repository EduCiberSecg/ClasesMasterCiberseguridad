import test from 'node:test';
import assert from 'node:assert/strict';
import { reset } from './helpers.mjs';
import * as I from '../modules/incidents/incidents.js';
import * as A from '../modules/alerts/alerts.js';
import * as Audit from '../modules/audit/audit.js';
import { setSettings } from '../storage/settings.js';

test('ciclo de vida completo de un incidente', async () => {
  await reset(); await setSettings({ operator: 'ana.admin' });
  const inc = await I.createIncident({ title: 'Ransomware en FS01', category: 'ransomware', priority: 'critical', assignee: 'Luis' });
  assert.match(inc.code, /^INC-\d{4}-0001$/);
  assert.equal((await A.listAlerts({ status: 'pending' })).length, 1, 'incidente crítico genera alerta');
  await I.updateIncident(inc.id, { status: 'investigating', assignee: 'Marta' });
  await I.addEvidence(inc.id, { type: 'log', description: 'Logs del servidor', sha256: 'a'.repeat(64) });
  await I.addAction(inc.id, 'Aislado de la red por el equipo de redes');
  await I.addComment(inc.id, 'Se avisa a dirección');
  let cur = await I.getIncident(inc.id);
  assert.equal(cur.evidence.length, 1); assert.equal(cur.actions.length, 1); assert.equal(cur.comments.length, 1);
  assert.ok(cur.history.some((h) => h.field === 'status' && h.to === 'investigating'));
  assert.ok(cur.history.every((h) => h.actor === 'ana.admin'));
  await assert.rejects(() => I.updateIncident(inc.id, { status: 'closed' }), /cierre/i);
  await assert.rejects(() => I.closeIncident(inc.id, { resolution: 'x' }), /obligatorio/);
  await I.closeIncident(inc.id, { resolution: 'Restaurado desde backup verificado' });
  cur = await I.getIncident(inc.id);
  assert.equal(cur.status, 'closed'); assert.ok(cur.closure);
  await assert.rejects(() => I.addComment(inc.id, 'tarde'), /cerrado/);
  await I.reopenIncident(inc.id, 'Reinfección detectada');
  assert.equal((await I.getIncident(inc.id)).status, 'investigating');
  const log = await Audit.list({ action: 'incident' });
  assert.ok(log.length >= 6);
});
test('validación de entradas', async () => {
  await reset();
  await assert.rejects(() => I.createIncident({ title: 'a' }), /obligatorio/);
  await assert.rejects(() => I.createIncident({ title: 'Válido', category: 'hack' }), /no válid/);
  await assert.rejects(() => I.createIncident({ title: 'Válido', priority: 'urgentisimo' }), /no válid/);
  await assert.rejects(() => I.createIncident({ title: 'Válido', detectedAt: 'ayer-ish' }), /no válida/);
  const x = await I.createIncident({ title: 'XSS <img src=x onerror=alert(1)>', description: 'ok\u0000ok' });
  assert.equal(x.description, 'okok'); // controles eliminados; el HTML se neutraliza al renderizar con textContent
});
test('auditoría no almacena secretos', async () => {
  await reset();
  await Audit.log('settings.update', { safeBrowsingKey: 'SECRET123', nested: { token: 'abc' }, ok: 1 });
  const [e] = await Audit.list();
  assert.equal(e.details.safeBrowsingKey, '[REDACTADO]'); assert.equal(e.details.nested.token, '[REDACTADO]'); assert.equal(e.details.ok, 1);
});
test('alertas: revisar y filtrar', async () => {
  await reset();
  const a = await A.createAlert({ severity: 'critical', title: 'Prueba' });
  await A.createAlert({ severity: 'low', title: 'Otra' });
  assert.equal((await A.listAlerts({ status: 'pending' }))[0].severity, 'critical', 'ordenadas por gravedad');
  await A.markReviewed(a.id);
  assert.equal((await A.listAlerts({ status: 'reviewed' })).length, 1);
  assert.equal(await A.markAllReviewed(), 1);
  await assert.rejects(() => A.createAlert({ severity: 'x', title: 'bad' }));
});
test('ajustes: saneamiento de claves y URL', async () => {
  await reset();
  const s = await setSettings({ safeBrowsingKey: 'AIza<script>123', backendUrl: 'http://inseguro', operator: '<b>Eva</b>' });
  assert.equal(s.safeBrowsingKey, 'AIzascript123'); assert.equal(s.backendUrl, ''); assert.ok(!s.operator.includes('<'));
});
