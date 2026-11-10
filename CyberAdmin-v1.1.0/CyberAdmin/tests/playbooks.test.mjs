import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { reset } from './helpers.mjs';
import { PLAYBOOKS, SECTIONS, checklistItems } from '../modules/playbooks/playbooks.js';
import { CATEGORIES } from '../modules/incidents/incidents.js';
import { loadChecklist, toggleItem, resetChecklist } from '../modules/playbooks/checklist.js';
import { reputationMock } from './reputation.mock.mjs';

test('12 protocolos con todas las secciones requeridas', () => {
  assert.equal(PLAYBOOKS.length, 12);
  for (const p of PLAYBOOKS) {
    for (const [k] of SECTIONS) assert.ok(p[k] && p[k].length > 0, `${p.id} sin ${k}`);
    assert.ok(p.investigate.some((x) => /evidencias/i.test(x)), `${p.id} sin preservación de evidencias`);
    assert.ok(CATEGORIES.includes(p.id), `${p.id} no corresponde a una categoría`);
  }
});
test('checklist persistente', async () => {
  await reset();
  const items = checklistItems(PLAYBOOKS[0]);
  const r = await toggleItem('phishing', 'inc1', items[0].key, true);
  assert.equal(r.prog.done, 1);
  assert.ok((await loadChecklist('phishing', 'inc1')).done[items[0].key]);
  assert.equal(Object.keys((await loadChecklist('phishing', 'otro')).done).length, 0);
  await assert.rejects(() => toggleItem('phishing', null, 'zzz.9', true));
  await resetChecklist('phishing', 'inc1');
  assert.equal(Object.keys((await loadChecklist('phishing', 'inc1')).done).length, 0);
});
test('manifest cumple mínimo privilegio', () => {
  const m = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url)));
  assert.equal(m.manifest_version, 3);
  assert.ok(!m.host_permissions && !m.content_scripts);
  assert.ok(!m.permissions.includes('tabs') && !m.permissions.includes('history') && !m.permissions.includes('<all_urls>'));
  assert.ok(!/unsafe-eval|unsafe-inline/.test(m.content_security_policy.extension_pages));
});
test('integraciones de reputación (mock de red)', async () => {
  const { sb, vt } = await reputationMock();
  assert.equal(sb.status, 'listed'); assert.deepEqual(sb.threats, ['SOCIAL_ENGINEERING']);
  assert.equal(vt.status, 'listed'); assert.equal(vt.stats.malicious, 3);
});
