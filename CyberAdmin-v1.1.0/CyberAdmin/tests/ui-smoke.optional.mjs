// Test opcional de UI (requiere: npm i --no-save jsdom). Ejecuta: node tests/ui-smoke.optional.mjs
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><body><div id="nav"></div><div id="main"></div></body>', { url: 'https://x.test/dashboard/index.html' });
for (const k of ['window','document','Node','HTMLElement','Blob','location']) Object.defineProperty(globalThis, k, { value: dom.window[k], configurable: true });
globalThis.URL.createObjectURL = () => 'blob:x'; globalThis.URL.revokeObjectURL = () => {};
import { fileURLToPath } from 'node:url';
const R = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');
const wait = (ms = 20) => new Promise((r) => setTimeout(r, ms));
const { loadDemo } = await import(R + '/modules/incidents/demo.js');
const go = (p) => { console.log('   go →', p); };
const errs = [];
const views = {
  dashboard: ['dashboard.js', 'renderDashboard', {}], phishing: ['phishing.js', 'renderPhishing', { params: new URLSearchParams('u=http://paypa1.com.x.tk/login') }],
  incidents: ['incidents.js', 'renderIncidents', { sub: [] }], alerts: ['alerts.js', 'renderAlerts', {}], playbooks: ['playbooks.js', 'renderPlaybooks', { sub: [], params: new URLSearchParams() }],
  audit: ['audit.js', 'renderAudit', {}], reports: ['reports.js', 'renderReports', {}], settings: ['settings.js', 'renderSettings', {}]
};
async function check(label, name, extra = {}) {
  const [file, fn, ctx] = views[name];
  const m = await import(`${R}/dashboard/views/${file}`);
  try {
    const el = await m[fn]({ go, sub: [], params: new URLSearchParams(), ...ctx, ...extra });
    const html = el.outerHTML;
    if (el.querySelector('script,img,iframe,[onerror],[onclick][href]') || [...el.querySelectorAll('*')].some((n) => [...n.attributes].some((a) => /^on/.test(a.name)))) errs.push(label + ': elemento/atributo peligroso en DOM');
    console.log(`✓ ${label} (${html.length} bytes, ${el.querySelectorAll('svg').length} svg, ${el.querySelectorAll('button').length} botones)`);
    return el;
  } catch (e) { errs.push(`${label}: ${e.stack}`); console.log('✗', label, e.message); }
}
await check('empty dashboard', 'dashboard');
await loadDemo();
const d = await check('dashboard con datos', 'dashboard');
console.log('   tarjetas stat:', [...d.querySelectorAll('.stat .v')].map((e) => e.textContent).join(' | '));
const ph = await check('phishing', 'phishing');
ph.querySelector('button.btn.primary').click(); await wait(100);
console.log('   resultado phishing:', ph.querySelector('.card .v')?.textContent, '| indicadores:', ph.querySelectorAll('.ind').length);
const inc = await check('incidentes lista', 'incidents');
const { listIncidents, createIncident } = await import(R + '/modules/incidents/incidents.js');
const x = await createIncident({ title: 'XSS <img src=x onerror=alert(1)>', description: '<script>alert(1)</script>', category: 'phishing', priority: 'high' });
await check('incidente detalle', 'incidents', { sub: [x.id] });
await check('incidente nuevo', 'incidents', { sub: ['new'] });
await check('alertas', 'alerts'); await check('protocolos lista', 'playbooks');
const pb = await check('protocolo detalle', 'playbooks', { sub: ['ransomware'], params: new URLSearchParams('inc=' + x.id) });
const cb = pb.querySelector('.checklist input'); cb.checked = true; cb.dispatchEvent(new dom.window.Event('change')); await wait(50);
console.log('   progreso tras marcar:', pb.querySelector('.bar-p i').style.width, pb.querySelector('.row b').textContent);
await check('auditoría', 'audit'); await check('informes', 'reports'); await check('configuración', 'settings');
console.log(errs.length ? '\nERRORES:\n' + errs.join('\n') : '\n✓ Smoke test UI sin errores');
process.exit(errs.length ? 1 : 0);
