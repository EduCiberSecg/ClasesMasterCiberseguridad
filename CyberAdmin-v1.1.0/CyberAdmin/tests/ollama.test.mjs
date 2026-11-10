import test from 'node:test';
import assert from 'node:assert/strict';
import { reset } from './helpers.mjs';
import { chat, listModels, readNdjson, OllamaError } from '../services/ollama.js';
import { buildMessages, buildContext, ask, SYSTEM_PROMPT, MAX_HISTORY } from '../modules/assistant/assistant.js';
import { createIncident } from '../modules/incidents/incidents.js';
import { createAlert } from '../modules/alerts/alerts.js';
import { setSettings, getSettings, sanitizeSettings } from '../storage/settings.js';
import { list } from '../modules/audit/audit.js';

const enc = new TextEncoder();
const streamOf = (chunks) => new ReadableStream({ start(c) { chunks.forEach((x) => c.enqueue(enc.encode(x))); c.close(); } });
const okStream = (chunks) => async () => ({ ok: true, status: 200, body: streamOf(chunks) });

test('readNdjson reensambla líneas partidas entre fragmentos', async () => {
  const out = []; for await (const o of readNdjson(streamOf(['{"a":1}\n{"b"', ':2}\n', '{"c":3}']))) out.push(o);
  assert.deepEqual(out, [{ a: 1 }, { b: 2 }, { c: 3 }]);
});
test('chat acumula tokens y envía el cuerpo esperado', async () => {
  let req; const seen = [];
  const f = async (url, init) => { req = { url, body: JSON.parse(init.body) }; return okStream(['{"message":{"content":"Ho"}}\n{"message":{"content":"la"}}\n{"done":true}\n'])(); };
  const t = await chat({ url: 'http://localhost:11434/', model: 'm1', messages: [{ role: 'user', content: 'x' }], onToken: (x) => seen.push(x), fetchImpl: f });
  assert.equal(t, 'Hola'); assert.deepEqual(seen, ['Ho', 'Hola']);
  assert.equal(req.url, 'http://localhost:11434/api/chat'); assert.equal(req.body.stream, true); assert.equal(req.body.model, 'm1');
});
test('errores claros: red, 403, 404 modelo, error en stream, sin modelo', async () => {
  const args = { url: 'http://localhost:11434', model: 'm', messages: [] };
  await assert.rejects(chat({ ...args, fetchImpl: async () => { throw new TypeError('fail'); } }), (e) => e.code === 'network');
  await assert.rejects(chat({ ...args, fetchImpl: async () => ({ ok: false, status: 403 }) }), (e) => e.code === 'origin' && /OLLAMA_ORIGINS/.test(e.message));
  await assert.rejects(chat({ ...args, fetchImpl: async () => ({ ok: false, status: 404 }) }), (e) => e.code === 'model' && /ollama pull m/.test(e.message));
  await assert.rejects(chat({ ...args, fetchImpl: okStream(['{"error":"boom"}\n']) }), (e) => e instanceof OllamaError && e.message === 'boom');
  await assert.rejects(chat({ ...args, model: '', fetchImpl: okStream([]) }), (e) => e.code === 'model');
});
test('listModels devuelve nombres ordenados', async () => {
  const f = async () => ({ ok: true, status: 200, json: async () => ({ models: [{ name: 'b' }, { name: 'a' }] }) });
  assert.deepEqual(await listModels('http://localhost:11434', f), ['a', 'b']);
});
test('ajustes: solo localhost para Ollama y modelo saneado', () => {
  assert.equal(sanitizeSettings({ ollamaUrl: 'http://evil.com:11434' }).ollamaUrl, 'http://localhost:11434');
  assert.equal(sanitizeSettings({ ollamaUrl: 'https://localhost:11434' }).ollamaUrl, 'http://localhost:11434');
  assert.equal(sanitizeSettings({ ollamaUrl: 'http://127.0.0.1:8080/' }).ollamaUrl, 'http://127.0.0.1:8080');
  assert.equal(sanitizeSettings({ ollamaModel: 'llama3.2:latest; rm' }).ollamaModel, 'llama3.2:latestrm');
});
test('buildMessages limita historial y el contexto va en el sistema', () => {
  const hist = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `m${i}`, extra: 1 }));
  const m = buildMessages(hist, '<datos_cyberadmin>x</datos_cyberadmin>');
  assert.equal(m.length, MAX_HISTORY + 1); assert.equal(m[0].role, 'system');
  assert.ok(m[0].content.startsWith(SYSTEM_PROMPT) && m[0].content.includes('<datos_cyberadmin>')); assert.ok(!('extra' in m[1]));
});
test('contexto incluye incidentes abiertos y alertas, sin descripciones', async () => {
  await reset();
  await createIncident({ title: 'Ransomware en FS01', description: 'SECRETO-DESC', category: 'ransomware', priority: 'critical' });
  await createAlert({ severity: 'high', title: 'Login anómalo' });
  const c = await buildContext();
  assert.ok(c.includes('Ransomware en FS01') && c.includes('Login anómalo')); assert.ok(!c.includes('SECRETO-DESC'));
});
test('ask audita sin guardar el contenido de la consulta', async () => {
  await reset(); await setSettings({ ollamaModel: 'm1' });
  const t = await ask([{ role: 'user', content: 'PREGUNTA-CONFIDENCIAL' }], { fetchImpl: okStream(['{"message":{"content":"ok"}}\n{"done":true}\n']) });
  assert.equal(t, 'ok');
  const rows = await list({ action: 'assistant.query' });
  assert.equal(rows.length, 1); assert.ok(!JSON.stringify(rows).includes('PREGUNTA-CONFIDENCIAL')); assert.equal(rows[0].details.model, 'm1');
});
