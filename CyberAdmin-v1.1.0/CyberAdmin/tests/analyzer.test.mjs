import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeUrl, urlForExternal, levenshtein } from '../modules/phishing/analyzer.js';
const ids = (r) => r.indicators.map((i) => i.id);

test('URL legítima: bajo y con aviso de que no garantiza seguridad', () => {
  const r = analyzeUrl('https://www.google.com/search?q=hola');
  assert.equal(r.level, 'low'); assert.equal(r.lowDisclaimer, true);
  assert.match(r.recommendations[0], /NO garantiza/);
});
test('IP + HTTP + login', () => { const r = analyzeUrl('http://192.168.4.5/login/verify'); assert.ok(ids(r).includes('ip') && ids(r).includes('http')); assert.ok(['high', 'critical'].includes(r.level)); });
test('Punycode / IDN', () => { assert.ok(ids(analyzeUrl('https://xn--pypal-4ve.com/')).includes('punycode')); assert.ok(ids(analyzeUrl('https://раураl.com/')).includes('punycode')); });
test('Cirílico mezclado con latino', () => assert.ok(ids(analyzeUrl('https://аpple.com/')).includes('mixed')));
test('Subdominios excesivos', () => assert.ok(ids(analyzeUrl('https://a.b.c.d.e.example.com/')).includes('subdomains')));
test('Suplantación de marca en subdominio', () => { const r = analyzeUrl('https://paypal.com.secure-login.xyz/'); assert.ok(ids(r).includes('brand')); assert.notEqual(r.level, 'low'); });
test('Dominio legítimo de marca no se marca', () => assert.ok(!ids(analyzeUrl('https://accounts.google.com/signin')).includes('brand')));
test('Typosquatting con homoglifos (paypa1)', () => { const r = analyzeUrl('https://paypa1.com/'); assert.ok(ids(r).includes('brand') || ids(r).includes('typosquat')); });
test('Arroba en la URL', () => assert.ok(ids(analyzeUrl('https://paypal.com@evil.example/')).includes('userinfo')));
test('Esquema javascript', () => { const r = analyzeUrl('javascript:alert(1)'); assert.ok(ids(r).includes('scheme')); assert.notEqual(r.level, 'low'); });
test('Acortador y redirección abierta', () => { assert.ok(ids(analyzeUrl('https://bit.ly/3abc')).includes('shortener')); assert.ok(ids(analyzeUrl('https://site.com/r?url=https://evil.com')).includes('openredirect')); });
test('Entradas inválidas', () => { assert.ok(analyzeUrl('').error); assert.ok(analyzeUrl('a'.repeat(3000)).error); });
test('Sin esquema se asume http', () => assert.ok(!analyzeUrl('example.com').error));
test('Fecha de análisis presente', () => assert.match(analyzeUrl('https://example.com').analyzedAt, /^\d{4}-\d\d-\d\dT/));
test('URL externa: elimina query, fragmento y credenciales', () => assert.equal(urlForExternal('https://u:p@example.com/a?token=SECRET#x', true), 'https://example.com/a'));
test('levenshtein', () => assert.equal(levenshtein('kitten', 'sitting'), 3));
